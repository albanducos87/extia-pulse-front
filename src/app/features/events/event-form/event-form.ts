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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  EVENT_STATUS_LABELS,
  EventRequest,
  EventStatus,
  PulseEvent,
  VISIBILITY_LABELS,
  Visibility,
} from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventTypeService } from '../../../core/services/event-type.service';
import { EventService } from '../../../core/services/event.service';
import { PoleService } from '../../../core/services/pole.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon';

const TIME_ZONES = ['Europe/Paris', 'America/Toronto', 'Europe/London', 'UTC'];

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
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './event-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventForm {
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly poles = toSignal(inject(PoleService).getPoles(), { initialValue: [] });
  protected readonly eventTypes = toSignal(inject(EventTypeService).getAll(), { initialValue: [] });
  protected readonly statusOptions = (Object.entries(EVENT_STATUS_LABELS) as [EventStatus, string][]);
  protected readonly visibilityOptions = Object.entries(VISIBILITY_LABELS) as [Visibility, string][];
  protected readonly timeZones = TIME_ZONES;

  protected readonly eventId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.eventId() !== null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected readonly form = inject(FormBuilder).group(
    {
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      eventTypeId: [null as number | null, Validators.required],
      poleId: [this.auth.currentUser()?.poleId ?? null, Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      timeZone: ['Europe/Paris'],
      locationName: [''],
      address: [''],
      onlineUrl: ['', Validators.pattern(/^https?:\/\/\S+$/)],
      capacity: [null as number | null, [Validators.required, Validators.min(1)]],
      rsvpDeadline: ['', Validators.required],
      visibility: ['POLE' as Visibility, Validators.required],
      status: ['DRAFT' as EventStatus, Validators.required],
    },
    { validators: [eventDatesValidator, locationValidator] },
  );

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
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
        this.router.navigate(['/events', event.id]);
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
          this.router.navigate(['/events', id]);
          return;
        }
        this.form.setValue({
          title: e.title,
          description: e.description ?? '',
          eventTypeId: e.eventTypeId,
          poleId: e.poleId,
          startDate: toInputDate(e.startAt),
          endDate: toInputDate(e.endAt),
          timeZone: e.timezone ?? 'Europe/Paris',
          locationName: e.locationName ?? '',
          address: e.address ?? '',
          onlineUrl: e.onlineUrl ?? '',
          capacity: e.capacity,
          rsvpDeadline: toInputDate(e.rsvpDeadline),
          visibility: e.visibility,
          status: e.status,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err);
        this.router.navigate(['/events']);
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
      timeZone: v.timeZone || null,
      locationName: v.locationName?.trim() || null,
      address: v.address?.trim() || null,
      onlineUrl: v.onlineUrl?.trim() || null,
      capacity: v.capacity,
      rsvpDeadline: fromInputDate(v.rsvpDeadline)!,
      visibility: v.visibility!,
      status: v.status!,
    };
  }
}

/** 'YYYY-MM-DDTHH:mm:ss' -> 'YYYY-MM-DDTHH:mm' (datetime-local input format). */
function toInputDate(value: string | null): string {
  return value ? value.slice(0, 16) : '';
}

/** 'YYYY-MM-DDTHH:mm' -> 'YYYY-MM-DDTHH:mm:ss' (backend LocalDateTime format). */
function fromInputDate(value: string | null | undefined): string | null {
  return value ? `${value.slice(0, 16)}:00` : null;
}
