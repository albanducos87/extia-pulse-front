import { DatePipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, switchMap, tap } from 'rxjs';
import { EventStatus, PulseEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EventService } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { isEventFull, isEventPast, isRsvpClosed } from '../../../core/utils/event.utils';
import { Icon } from '../../../shared/components/icon';
import { StatusLabelPipe } from '../../../shared/pipes/labels.pipe';
import { downloadBlob } from '../../../core/utils/download.utils';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'showParticipants.set(false)' },
})
export class EventDetail {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly event = signal<PulseEvent | null>(null);
  protected readonly loading = signal(true);
  /** An action (registration, status change, deletion) is in flight. */
  protected readonly busy = signal(false);
  protected readonly showParticipants = signal(false);

  protected readonly canEdit = computed(() => this.check((e) => this.auth.canEdit(e)));
  protected readonly isRegistered = computed(() =>
    this.check((e) => this.auth.isUserRegistered(e)),
  );
  protected readonly isPast = computed(() => this.check(isEventPast));
  protected readonly rsvpClosed = computed(() => this.check(isRsvpClosed));
  protected readonly isFull = computed(() => this.check(isEventFull));
  /** Percentage of seats taken, for the progress bar. */
  protected readonly fillRate = computed(() => {
    const event = this.event();
    if (!event?.capacity) return 0;
    return Math.min(100, (event.participants.length / event.capacity) * 100);
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.loading.set(true)),
        switchMap((params) => this.eventService.getEvent(Number(params.get('id')))),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (event) => {
          this.event.set(event);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.error(err);
          this.router.navigate(['/events'], { replaceUrl: true });
        },
      });
  }

  protected register(): void {
    this.updateRegistration(
      (eventId, userId) => this.eventService.register(eventId, userId),
      'Inscription confirmée',
      "Impossible de s'inscrire",
    );
  }

  protected unregister(): void {
    this.updateRegistration(
      (eventId, userId) => this.eventService.unregister(eventId, userId),
      'Désinscription confirmée',
      'Impossible de se désinscrire',
    );
  }

  protected goBack(domEvent: MouseEvent): void {
    domEvent.preventDefault();
    // Fall back to the list when the page was opened directly (no in-app history).
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigate(['/events'], { replaceUrl: true });
    }
  }

  protected async changeStatus(status: EventStatus): Promise<void> {
    const event = this.event()!;
    if (status === 'CANCELLED') {
      const confirmed = await this.confirm.ask({
        title: "Annuler l'évènement ?",
        message: `« ${event.title} » sera marqué comme annulé pour tous les participants.`,
        confirmLabel: "Annuler l'évènement",
        danger: true,
      });
      if (!confirmed) return;
    }
    this.busy.set(true);
    this.eventService
      .updateStatus(event.id, status)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          this.toast.success(status === 'PUBLISHED' ? 'Évènement publié' : 'Évènement annulé');
        },
        error: (err) => this.toast.error(err),
      });
  }

  protected async delete(): Promise<void> {
    const event = this.event()!;
    const confirmed = await this.confirm.ask({
      title: "Supprimer l'évènement ?",
      message: `« ${event.title} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.eventService.delete(event.id).subscribe({
      next: () => {
        this.toast.success('Évènement supprimé');
        this.router.navigate(['/events'], { replaceUrl: true });
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }

  protected exportToCalendar(): void {
    const event = this.event()!;
    this.eventService.downloadIcs(event.id).subscribe({
      next: ({ blob, fileName }) => downloadBlob(blob, fileName),
      error: () => this.toast.error("Impossible d'exporter l'évènement")
    });
  }

  /** Evaluates a predicate on the loaded event (false while loading). */
  private check(predicate: (event: PulseEvent) => boolean): boolean {
    const event = this.event();
    return !!event && predicate(event);
  }

  /** Runs a (un)registration call, then reloads the event to refresh the participant list. */
  private updateRegistration(
    action: (eventId: number, userId: number) => Observable<void>,
    successMessage: string,
    errorMessage: string,
  ): void {
    const eventId = this.event()!.id;
    const userId = this.auth.currentUser()!.id;
    this.busy.set(true);
    action(eventId, userId)
      .pipe(
        switchMap(() => this.eventService.getEvent(eventId)),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          this.toast.success(successMessage);
        },
        error: () => this.toast.error(errorMessage),
      });
  }
}
