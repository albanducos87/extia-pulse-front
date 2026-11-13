import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PulseEvent } from '../../core/models/event.model';
import { AuthService } from '../../core/services/auth.service';
import { StatusLabelPipe } from '../pipes/labels.pipe';
import { Icon } from './icon';

@Component({
  selector: 'app-event-card',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let e = event();
    <a class="event-card" [routerLink]="['/events', e.id]" [class.is-cancelled]="e.status === 'CANCELLED'">
      <div class="date-block">
        <span class="date-day">{{ e.startAt | date: 'd' }}</span>
        <span class="date-month">{{ e.startAt | date: 'MMM' }}</span>
      </div>
      <div class="event-card-body">
        <div class="event-card-tags">
          <span class="chip">{{ e.eventTypeLabel }}</span>
          <span class="badge badge-{{ e.status.toLowerCase() }}">{{ e.status | statusLabel }}</span>
          @if (isRegistered()) {
            <span class="chip chip-registered"><app-icon name="check" [size]="12" />Inscrit·e</span>
          } @else {
            <span class="chip chip-outline">Non inscrit·e</span>
          }
        </div>
        <h3 class="event-card-title">{{ e.title }}</h3>
        <ul class="meta">
          <li><app-icon name="clock" [size]="14" />{{ e.startAt | date: 'EEEE d MMMM, HH:mm' }}</li>
          @if (e.locationName) {
            <li><app-icon name="map-pin" [size]="14" />{{ e.locationName }}</li>
          } @else if (e.onlineUrl) {
            <li><app-icon name="video" [size]="14" />En ligne</li>
          }
        </ul>
      </div>
    </a>
  `,
})
export class EventCard {
  private readonly auth = inject(AuthService);

  readonly event = input.required<PulseEvent>();
  protected readonly isRegistered = computed(() => this.auth.isUserRegistered(this.event()));
}
