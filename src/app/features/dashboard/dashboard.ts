import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { PulseEvent } from '../../core/models/event.model';
import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ToastService } from '../../core/services/toast.service';
import { toLocalDateTime } from '../../core/utils/date.utils';
import { byStartDate } from '../../core/utils/event.utils';
import { EventCard } from '../../shared/components/event-card';
import { Icon } from '../../shared/components/icon';

/** Personal home page: only the events the current user organises or takes part in. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, EventCard, Icon],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  private readonly allEvents = signal<PulseEvent[]>([]);
  /** Fetched separately so drafts (possibly hidden from the global list) are included. */
  private readonly createdEvents = signal<PulseEvent[]>([]);

  private readonly now = toLocalDateTime(new Date());

  /** Upcoming, non-cancelled events I'm registered to. */
  protected readonly participations = computed(() =>
    this.allEvents()
      .filter(
        (e) => e.startAt >= this.now && e.status !== 'CANCELLED' && this.auth.isUserRegistered(e),
      )
      .sort(byStartDate),
  );

  /** Upcoming events I organise (drafts included). */
  protected readonly organised = computed(() =>
    this.createdEvents()
      .filter((e) => e.startAt >= this.now)
      .sort(byStartDate),
  );

  protected readonly stats = computed(() => [
    {
      label: 'Participations à venir',
      value: this.participations().length,
      icon: 'calendar' as const,
    },
    {
      label: 'Évènements organisés à venir',
      value: this.organised().length,
      icon: 'user' as const,
    },
    {
      label: 'Brouillons',
      value: this.organised().filter((e) => e.status === 'DRAFT').length,
      icon: 'edit' as const,
    },
  ]);

  constructor() {
    const eventService = inject(EventService);
    // Waits for the current user so isUserRegistered() can match participants.
    this.auth
      .loadCurrentUser()
      .pipe(
        switchMap(() =>
          forkJoin({
            all: eventService.getEvents(),
            created: eventService.getEventsCreatedByCurrentUser(),
          }),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ all, created }) => {
          this.allEvents.set(all);
          this.createdEvents.set(created);
        },
        error: (err) => this.toast.error(err),
      });
  }
}
