import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, map, startWith, switchMap, tap } from 'rxjs';
import {
  EVENT_STATUS_LABELS,
  EventFilter,
  EventStatus,
  PulseEvent,
  VISIBILITY_LABELS,
  Visibility,
} from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventTypeService } from '../../../core/services/event-type.service';
import { EventService } from '../../../core/services/event.service';
import { UserService } from '../../../core/services/user.service';
import { toLocalDateTime } from '../../../core/utils/date.utils';
import { EventCard } from '../../../shared/components/event-card';
import { Icon } from '../../../shared/components/icon';

@Component({
  selector: 'app-event-list',
  imports: [ReactiveFormsModule, RouterLink, EventCard, Icon],
  templateUrl: './event-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventList {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);

  protected readonly users = toSignal(inject(UserService).getUsers(), { initialValue: [] });
  protected readonly eventTypes = toSignal(inject(EventTypeService).getAllEventTypes(), {
    initialValue: [],
  });
  protected readonly statusOptions = Object.entries(EVENT_STATUS_LABELS) as [EventStatus, string][];
  protected readonly visibilityOptions = Object.entries(VISIBILITY_LABELS) as [
    Visibility,
    string,
  ][];

  protected readonly filters = inject(FormBuilder).group({
    search: [''],
    creatorId: [null as number | null],
    eventTypeId: [null as number | null],
    status: [null as EventStatus | null],
    visibility: [null as Visibility | null],
    startFrom: [''],
    startTo: [''],
    mine: [false],
    includePast: [false],
  });

  /** Mobile only: the advanced filters are collapsed behind a toggle. */
  protected readonly filtersOpen = signal(false);
  private readonly filterValues = toSignal(this.filters.valueChanges, {
    initialValue: this.filters.value,
  });
  protected readonly activeFilterCount = computed(() => {
    const { search, ...rest } = this.filterValues();
    return Object.values(rest).filter((v) => v !== null && v !== '' && v !== false).length;
  });

  protected readonly loading = signal(true);
  protected readonly events = signal<PulseEvent[]>([]);

  constructor() {
    this.filters.valueChanges
      .pipe(
        startWith(this.filters.value),
        debounceTime(200),
        tap(() => this.loading.set(true)),
        switchMap(() => this.eventService.getEvents(this.toFilter())),
        map((events) =>
          this.filters.controls.mine.value ? events.filter((e) => this.isMine(e)) : events,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((events) => {
        this.events.set(events);
        this.loading.set(false);
      });
  }

  protected resetFilters(): void {
    this.filters.reset({ mine: false, includePast: false });
  }

  /** Events I organise or am registered to. */
  private isMine(event: PulseEvent): boolean {
    return this.auth.isOrganiser(event) || this.auth.isUserRegistered(event);
  }

  private toFilter(): EventFilter {
    const f = this.filters.getRawValue();
    // Past events are hidden unless asked for (an explicit "Du" date takes precedence).
    const defaultStart = f.includePast ? null : toLocalDateTime(new Date());
    return {
      search: f.search,
      creatorId: f.creatorId,
      eventTypeId: f.eventTypeId,
      status: f.status,
      visibility: f.visibility,
      startFrom: f.startFrom ? `${f.startFrom}T00:00:00` : defaultStart,
      startTo: f.startTo ? `${f.startTo}T23:59:59` : null,
    };
  }
}
