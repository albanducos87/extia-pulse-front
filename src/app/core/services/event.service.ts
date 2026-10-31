import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MOCK_EVENTS, MOCK_EVENT_TYPES, MOCK_PARTICIPANT_COUNTS, enrichEvent } from '../data/mock-data';
import { EventFilter, EventRequest, PulseEvent } from '../models/event.model';
import { AuthService } from './auth.service';
import { ApiError, mockResponse } from './mock-http';

export interface Participation {
  count: number;
  registered: boolean;
}

/** In-memory stand-in for /api/events. */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly auth = inject(AuthService);

  private events: PulseEvent[] = [...MOCK_EVENTS];
  private nextId = Math.max(...this.events.map((e) => e.id)) + 1;
  private participantCounts: Record<number, number> = { ...MOCK_PARTICIPANT_COUNTS };
  private registrations = new Set<number>();

  getEvents(filter: EventFilter = {}): Observable<PulseEvent[]> {
    return mockResponse(() => {
      const search = filter.search?.trim().toLowerCase();
      return this.events
        .filter(
          (e) =>
            (filter.poleId == null || e.poleId === filter.poleId) &&
            (filter.creatorId == null || e.creatorId === filter.creatorId) &&
            (filter.eventTypeId == null || e.eventTypeId === filter.eventTypeId) &&
            (filter.visibility == null || e.visibility === filter.visibility) &&
            (filter.status == null || e.status === filter.status) &&
            (!filter.startFrom || e.startAt >= filter.startFrom) &&
            (!filter.startTo || e.startAt <= filter.startTo) &&
            (!search ||
              `${e.title} ${e.description ?? ''} ${e.locationName ?? ''}`
                .toLowerCase()
                .includes(search)),
        )
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
    });
  }

  getEvent(id: number): Observable<PulseEvent> {
    return mockResponse(() => this.findOrThrow(id));
  }

  create(request: EventRequest): Observable<PulseEvent> {
    return mockResponse(() => {
      this.validate(request);
      const creatorId = this.auth.currentUser()?.id ?? 0;
      const created = this.toEvent(this.nextId++, creatorId, request);
      this.events = [...this.events, created];
      return created;
    });
  }

  update(id: number, request: EventRequest): Observable<PulseEvent> {
    return mockResponse(() => {
      const existing = this.findOrThrow(id);
      this.validate(request);
      const updated = this.toEvent(id, existing.creatorId, request);
      this.events = this.events.map((e) => (e.id === id ? updated : e));
      return updated;
    });
  }

  updateStatus(id: number, status: PulseEvent['status']): Observable<PulseEvent> {
    return mockResponse(() => {
      const updated = { ...this.findOrThrow(id), status };
      this.events = this.events.map((e) => (e.id === id ? updated : e));
      return updated;
    });
  }

  delete(id: number): Observable<void> {
    return mockResponse(() => {
      this.findOrThrow(id);
      this.events = this.events.filter((e) => e.id !== id);
    });
  }

  // --- Participation (no backend endpoint yet) ---

  getParticipation(id: number): Observable<Participation> {
    return mockResponse(() => this.participation(id));
  }

  toggleRegistration(id: number): Observable<Participation> {
    return mockResponse(() => {
      const event = this.findOrThrow(id);
      const registered = this.registrations.has(id);
      if (!registered) {
        const { count } = this.participation(id);
        if (event.capacity != null && count >= event.capacity) {
          throw new ApiError(['L’évènement est complet']);
        }
        if (new Date(event.rsvpDeadline) < new Date()) {
          throw new ApiError(['La date limite d’inscription est dépassée']);
        }
        this.registrations.add(id);
      } else {
        this.registrations.delete(id);
      }
      return this.participation(id);
    });
  }

  private participation(id: number): Participation {
    const registered = this.registrations.has(id);
    return { count: (this.participantCounts[id] ?? 0) + (registered ? 1 : 0), registered };
  }

  private findOrThrow(id: number): PulseEvent {
    const event = this.events.find((e) => e.id === id);
    if (!event) {
      throw new ApiError([`L'évènement avec id ${id} n'existe pas`]);
    }
    return event;
  }

  private toEvent(id: number, creatorId: number, r: EventRequest): PulseEvent {
    return enrichEvent({
      id,
      creatorId,
      title: r.title,
      description: r.description,
      eventTypeId: r.eventTypeId,
      poleId: r.poleId,
      startAt: r.startDate,
      endAt: r.endDate,
      timezone: r.timeZone,
      locationName: r.locationName,
      address: r.address,
      onlineUrl: r.onlineUrl,
      capacity: r.capacity,
      rsvpDeadline: r.rsvpDeadline,
      visibility: r.visibility,
      status: r.status,
    });
  }

  /** Same rules as the backend EventValidator. */
  private validate(r: EventRequest): void {
    const errors: string[] = [];
    if (r.endDate && r.endDate <= r.startDate) {
      errors.push('La date de fin doit être postérieure à la date de début');
    }
    if (r.rsvpDeadline > r.startDate) {
      errors.push("La date limite d'inscription doit précéder le début de l'évènement");
    }
    if (r.capacity == null || r.capacity <= 0) {
      errors.push('La capacité doit être positive');
    }
    if (!MOCK_EVENT_TYPES.some((t) => t.id === r.eventTypeId)) {
      errors.push("Type d'évènement introuvable : " + r.eventTypeId);
    }
    if (errors.length) {
      throw new ApiError(errors);
    }
  }
}
