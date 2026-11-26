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
  /** Past events are hidden unless the user asks for them. */
  protected readonly includePast = signal(false);

  /** Non-cancelled events I'm registered to, excluding those I organise (listed separately). */
  private readonly allParticipations = computed(() => {
    const organisedIds = new Set(this.createdEvents().map((e) => e.id));
    return this.allEvents()
      .filter(
        (e) =>
          e.status !== 'CANCELLED' &&
          !organisedIds.has(e.id) &&
          !this.auth.isOrganiser(e) &&
          this.auth.isUserRegistered(e),
      )
      .sort(byStartDate);
  });
  private readonly upcomingParticipations = computed(() =>
    this.allParticipations().filter((e) => this.isUpcoming(e)),
  );
  protected readonly participations = computed(() =>
    this.includePast() ? this.allParticipations() : this.upcomingParticipations(),
  );

  /** Events I organise (drafts included). */
  private readonly allOrganised = computed(() => [...this.createdEvents()].sort(byStartDate));
  private readonly upcomingOrganised = computed(() =>
    this.allOrganised().filter((e) => this.isUpcoming(e)),
  );
  protected readonly organised = computed(() =>
    this.includePast() ? this.allOrganised() : this.upcomingOrganised(),
  );

  protected readonly stats = computed(() => [
    {
      label: 'Participations à venir',
      value: this.upcomingParticipations().length,
      icon: 'calendar' as const,
    },
    {
      label: 'Évènements organisés à venir',
      value: this.upcomingOrganised().length,
      icon: 'user' as const,
    },
    {
      label: 'Brouillons',
      value: this.upcomingOrganised().filter((e) => e.status === 'DRAFT').length,
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

  private isUpcoming(event: PulseEvent): boolean {
    return event.startAt >= this.now;
  }
}
