import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, switchMap, tap } from 'rxjs';
import { EventStatus, PulseEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EventService, Participation } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon';
import { StatusLabelPipe, VisibilityLabelPipe } from '../../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe, VisibilityLabelPipe],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly event = signal<PulseEvent | null>(null);
  protected readonly participation = signal<Participation>({ count: 0, registered: false });
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly canEdit = computed(() => {
    const event = this.event();
    return !!event && this.auth.canEdit(event);
  });
  protected readonly isPast = computed(() => {
    const event = this.event();
    return !!event && new Date(event.endAt ?? event.startAt) < new Date();
  });
  protected readonly rsvpClosed = computed(() => {
    const event = this.event();
    return !!event && new Date(event.rsvpDeadline) < new Date();
  });
  protected readonly isFull = computed(() => {
    const capacity = this.event()?.capacity;
    return capacity != null && this.participation().count >= capacity;
  });
  protected readonly fillRate = computed(() => {
    const capacity = this.event()?.capacity;
    return capacity ? Math.min(100, (this.participation().count / capacity) * 100) : 0;
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.loading.set(true)),
        switchMap((params) => {
          const id = Number(params.get('id'));
          return forkJoin([
            this.eventService.getEvent(id),
            this.eventService.getParticipation(id),
          ]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ([event, participation]) => {
          this.event.set(event);
          this.participation.set(participation);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.error(err);
          this.router.navigate(['/events']);
        },
      });
  }

  protected toggleRegistration(): void {
    const event = this.event()!;
    this.busy.set(true);
    this.eventService.toggleRegistration(event.id).subscribe({
      next: (participation) => {
        this.participation.set(participation);
        this.busy.set(false);
        this.toast.success(
          participation.registered ? 'Inscription confirmée 🎉' : 'Inscription annulée',
        );
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }

  protected async changeStatus(status: EventStatus): Promise<void> {
    const event = this.event()!;
    if (status === 'CANCELLED') {
      const ok = await this.confirm.ask({
        title: "Annuler l'évènement ?",
        message: `« ${event.title} » sera marqué comme annulé pour tous les participants.`,
        confirmLabel: "Annuler l'évènement",
        danger: true,
      });
      if (!ok) return;
    }
    this.busy.set(true);
    this.eventService.updateStatus(event.id, status).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.busy.set(false);
        this.toast.success(status === 'PUBLISHED' ? 'Évènement publié' : 'Évènement annulé');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }

  protected async delete(): Promise<void> {
    const event = this.event()!;
    const ok = await this.confirm.ask({
      title: "Supprimer l'évènement ?",
      message: `« ${event.title} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.eventService.delete(event.id).subscribe({
      next: () => {
        this.toast.success('Évènement supprimé');
        this.router.navigate(['/events']);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }
}
