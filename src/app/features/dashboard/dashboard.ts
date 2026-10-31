import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toLocalDateTime } from '../../core/data/mock-data';
import { PulseEvent } from '../../core/models/event.model';
import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ToastService } from '../../core/services/toast.service';
import { EventCard } from '../../shared/components/event-card';
import { Icon } from '../../shared/components/icon';

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
  private readonly events = signal<PulseEvent[]>([]);

  private readonly now = toLocalDateTime(new Date());
  private readonly upcoming = computed(() =>
    this.events().filter((e) => e.startAt >= this.now && e.status === 'PUBLISHED'),
  );

  protected readonly nextEvents = computed(() => this.upcoming().slice(0, 4));
  protected readonly myEvents = computed(() =>
    this.events().filter(
      (e) => e.creatorId === this.auth.currentUser()?.id && e.startAt >= this.now,
    ),
  );
  protected readonly stats = computed(() => {
    const weekAhead = toLocalDateTime(new Date(Date.now() + 7 * 864e5));
    return [
      { label: 'Évènements à venir', value: this.upcoming().length, icon: 'calendar' as const },
      {
        label: 'Cette semaine',
        value: this.upcoming().filter((e) => e.startAt <= weekAhead).length,
        icon: 'clock' as const,
      },
      { label: 'Mes évènements', value: this.myEvents().length, icon: 'user' as const },
      {
        label: 'Brouillons',
        value: this.myEvents().filter((e) => e.status === 'DRAFT').length,
        icon: 'edit' as const,
      },
    ];
  });

  constructor() {
    inject(EventService)
      .getEvents()
      .subscribe({
        next: (events) => {
          this.events.set(events);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.error(err);
          this.loading.set(false);
        },
      });
  }
}
