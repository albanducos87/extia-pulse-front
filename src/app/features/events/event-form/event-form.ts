import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { EventRequest, EventStatus, PulseEvent } from '../../../core/models/event.model';
import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventTypeService } from '../../../core/services/event-type.service';
import { EventService } from '../../../core/services/event.service';
import { PoleService } from '../../../core/services/pole.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { fromInputDate, toInputDate } from '../../../core/utils/date.utils';
import { Icon } from '../../../shared/components/icon';

const MAX_INVITE_SUGGESTIONS = 8;

/** Cross-field rules, same as the backend EventValidator. */
const eventDatesValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const { startDate, endDate, rsvpDeadline } = group.value;
  const errors: ValidationErrors = {};
  if (startDate && endDate && endDate <= startDate) {
    errors['endBeforeStart'] = true;
  }
  if (startDate && rsvpDeadline && rsvpDeadline > startDate) {
    errors['rsvpAfterStart'] = true;
  }
  return Object.keys(errors).length ? errors : null;
};

const locationValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const { address, onlineUrl } = group.value;
  return address?.trim() || onlineUrl?.trim() ? null : { locationRequired: true };
};

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './event-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventForm {
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly poles = toSignal(inject(PoleService).getPoles(), { initialValue: [] });
  protected readonly eventTypes = toSignal(inject(EventTypeService).getAllEventTypes(), {
    initialValue: [],
  });

  // --- Invitations ---
  private readonly users = toSignal(inject(UserService).getUsers({ active: true }), {
    initialValue: [] as AppUser[],
  });
  /** Everyone who can be invited (the organiser is excluded). */
  private readonly invitableUsers = computed(() => {
    const me = this.auth.currentUser()?.id;
    return this.users().filter((u) => u.id !== me);
  });
  protected readonly invitedIds = signal<number[]>([]);
  protected readonly inviteSearch = signal('');
  protected readonly invitedUsers = computed(() => {
    const ids = new Set(this.invitedIds());
    return this.invitableUsers().filter((u) => ids.has(u.id));
  });
  protected readonly inviteCandidates = computed(() => {
    const search = this.inviteSearch().trim().toLowerCase();
    if (!search) return [];
    const ids = new Set(this.invitedIds());
    return this.invitableUsers()
      .filter(
        (u) =>
          !ids.has(u.id) &&
          `${u.firstName} ${u.lastName} ${u.email} ${u.pole?.name ?? ''}`
            .toLowerCase()
            .includes(search),
      )
      .slice(0, MAX_INVITE_SUGGESTIONS);
  });
  /** Pole selected in the form, to offer "invite the whole pole". */
  protected readonly selectedPole = signal<number | null>(null);
  protected readonly selectedPoleName = computed(
    () => this.poles().find((p) => p.id === this.selectedPole())?.name ?? null,
  );
  /** Capacity typed in the form: invitations can't exceed it. */
  protected readonly capacity = signal<number | null>(null);
  /** Whether the organiser takes a seat themselves (counts against capacity). */
  protected readonly registered = signal(false);
  protected readonly remainingInvites = computed(() => {
    const capacity = this.capacity();
    if (capacity == null || capacity < 1) return null;
    return capacity - this.invitedIds().length - (this.registered() ? 1 : 0);
  });
  protected readonly invitesFull = computed(() => (this.remainingInvites() ?? 1) <= 0);
  protected readonly overCapacity = computed(() => (this.remainingInvites() ?? 0) < 0);
  protected readonly uninvitedPoleMembers = computed(() => {
    const poleId = this.selectedPole();
    const ids = new Set(this.invitedIds());
    return this.invitableUsers().filter((u) => u.pole?.id === poleId && !ids.has(u.id));
  });

  protected readonly eventId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.eventId() !== null);
  protected readonly backUrl = computed(() =>
    this.isEdit() ? `/events/${this.eventId()}` : '/events',
  );
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected readonly form = inject(FormBuilder).group(
    {
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      eventTypeId: [null as number | null, Validators.required],
      poleId: [this.auth.currentUser()?.pole?.id ?? null, Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      locationName: [''],
      address: [''],
      onlineUrl: ['', Validators.pattern(/^https?:\/\/\S+$/)],
      capacity: [null as number | null, [Validators.required, Validators.min(1)]],
      rsvpDeadline: ['', Validators.required],
      status: ['DRAFT' as EventStatus, Validators.required],
      registered: [{ value: false, disabled: true }],
    },
    { validators: [eventDatesValidator, locationValidator] },
  );

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    this.selectedPole.set(this.form.controls.poleId.value);
    this.form.controls.poleId.valueChanges.subscribe((v) => this.selectedPole.set(v));
    this.form.controls.capacity.valueChanges.subscribe((v) => {
      this.capacity.set(v);
      this.syncRegisteredAvailability();
    });
    this.form.controls.registered.valueChanges.subscribe((v) => this.registered.set(!!v));

    if (id) {
      this.eventId.set(Number(id));
      this.loadEvent(Number(id));
    }
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected showGroupError(error: string, ...fields: (keyof typeof this.form.controls)[]): boolean {
    return this.form.hasError(error) && fields.some((f) => this.form.controls[f].touched);
  }

  protected invite(user: AppUser): void {
    if (this.invitesFull()) return;
    this.invitedIds.update((ids) => (ids.includes(user.id) ? ids : [...ids, user.id]));
    this.inviteSearch.set('');
  }

  protected uninvite(user: AppUser): void {
    this.invitedIds.update((ids) => ids.filter((id) => id !== user.id));
  }

  protected inviteWholePole(): void {
    if (!this.canInviteWholePole()) return;
    const extra = this.uninvitedPoleMembers().map((u) => u.id);
    this.invitedIds.update((ids) => [...ids, ...extra]);
  }

  protected canInviteWholePole(): boolean {
    const remaining = this.remainingInvites();
    return remaining == null || this.uninvitedPoleMembers().length <= remaining;
  }

  protected clearInvitations(): void {
    this.invitedIds.set([]);
  }

  /** Enter in the search box invites the first suggestion instead of submitting the form. */
  protected onInviteEnter(domEvent: Event): void {
    domEvent.preventDefault();
    const first = this.inviteCandidates()[0];
    if (first) this.invite(first);
  }

  /** "S'inscrire" only makes sense once a valid capacity is known; unchecks it otherwise. */
  private syncRegisteredAvailability(): void {
    const control = this.form.controls.registered;
    if (this.form.controls.capacity.valid) {
      if (control.disabled) control.enable({ emitEvent: false });
    } else if (control.enabled || control.value) {
      control.setValue(false);
      control.disable({ emitEvent: false });
    }
  }

  protected goBack(domEvent: MouseEvent): void {
    domEvent.preventDefault();
    // Fall back to a sensible page when the form was opened directly (no in-app history).
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.backUrl());
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.overCapacity()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.serverErrors.set([]);

    const request = this.toRequest();
    const id = this.eventId();
    const save$: Observable<PulseEvent> =
      id !== null ? this.eventService.update(id, request) : this.eventService.create(request);

    save$.subscribe({
      next: (event) => {
        this.toast.success(id !== null ? 'Évènement mis à jour' : 'Évènement créé');
        this.router.navigate(['/events', event.id], { replaceUrl: true });
      },
      error: (err) => {
        this.saving.set(false);
        this.serverErrors.set(err?.errors ?? ['Une erreur est survenue']);
      },
    });
  }

  private loadEvent(id: number): void {
    this.loading.set(true);
    this.eventService.getEvent(id).subscribe({
      next: (e) => {
        if (!this.auth.canEdit(e)) {
          this.toast.error("Vous n'avez pas les droits pour modifier cet évènement");
          this.router.navigate(['/events', id], { replaceUrl: true });
          return;
        }
        this.form.setValue({
          title: e.title,
          description: e.description ?? '',
          eventTypeId: e.eventTypeId,
          poleId: e.poleId,
          startDate: toInputDate(e.startAt),
          endDate: toInputDate(e.endAt),
          locationName: e.locationName ?? '',
          address: e.address ?? '',
          onlineUrl: e.onlineUrl ?? '',
          capacity: e.capacity,
          rsvpDeadline: toInputDate(e.rsvpDeadline),
          status: e.status,
          registered: this.auth.isUserRegistered(e),
        });
        this.capacity.set(e.capacity);
        this.syncRegisteredAvailability();
        this.registered.set(this.form.controls.registered.value ?? false);
        this.invitedIds.set((e.invitedUsers ?? []).map((u) => u.id));
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err);
        this.router.navigate(['/events'], { replaceUrl: true });
      },
    });
  }

  private toRequest(): EventRequest {
    const v = this.form.getRawValue();
    return {
      title: v.title!.trim(),
      description: v.description?.trim() || null,
      eventTypeId: v.eventTypeId!,
      poleId: v.poleId!,
      startDate: fromInputDate(v.startDate)!,
      endDate: fromInputDate(v.endDate),
      locationName: v.locationName?.trim() || null,
      address: v.address?.trim() || null,
      onlineUrl: v.onlineUrl?.trim() || null,
      capacity: v.capacity,
      rsvpDeadline: fromInputDate(v.rsvpDeadline)!,
      status: v.status!,
      invitedUserIds: this.invitedIds(),
      creatorRegistered: v.registered!,
    };
  }
}
