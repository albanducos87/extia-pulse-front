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
import { AuthService } from '../../../core/services/auth.service';
import { EventTypeService } from '../../../core/services/event-type.service';
import { EventService } from '../../../core/services/event.service';
import { PoleService } from '../../../core/services/pole.service';
import { ToastService } from '../../../core/services/toast.service';
import { fromInputDate, toInputDate } from '../../../core/utils/date.utils';
import { Icon } from '../../../shared/components/icon';

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
    this.form.controls.capacity.valueChanges.subscribe(() => this.syncRegisteredAvailability());

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
    if (this.form.invalid) {
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
        this.syncRegisteredAvailability();
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
      creatorRegistered: v.registered!,
    };
  }
}
