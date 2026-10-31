import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PulseEvent } from '../../core/models/event.model';
import { StatusLabelPipe, VisibilityLabelPipe } from '../pipes/labels.pipe';
import { Icon } from './icon';

@Component({
  selector: 'app-event-card',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe, VisibilityLabelPipe],
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
        </div>
        <h3 class="event-card-title">{{ e.title }}</h3>
        <ul class="meta">
          <li><app-icon name="clock" [size]="14" />{{ e.startAt | date: 'EEEE d MMMM, HH:mm' }}</li>
          @if (e.locationName) {
            <li><app-icon name="map-pin" [size]="14" />{{ e.locationName }}</li>
          } @else if (e.onlineUrl) {
            <li><app-icon name="video" [size]="14" />En ligne</li>
          }
          <li><app-icon name="eye" [size]="14" />{{ e.visibility | visibilityLabel }} · {{ e.poleName }}</li>
        </ul>
      </div>
    </a>
  `,
})
export class EventCard {
  readonly event = input.required<PulseEvent>();
}
