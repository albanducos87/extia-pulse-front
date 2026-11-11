import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { MOCK_PARTICIPANT_COUNTS, enrichEvent } from '../data/mock-data';
import { EventFilter, EventRequest, PulseEvent } from '../models/event.model';
import { AuthService } from './auth.service';
import { ApiError, mockResponse } from './mock-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.dev';

export interface Participation {
  count: number;
  registered: boolean;
}

/** In-memory stand-in for /api/events. */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly apiEventUrl = `${environment.apiUrl}/events`;

  private participantCounts: Record<number, number> = { ...MOCK_PARTICIPANT_COUNTS };
  private registrations = new Set<number>();

  getEvents(filter: EventFilter = {}): Observable<PulseEvent[]> {

    return this.http.get<PulseEvent[]>(this.apiEventUrl).pipe(
      map((events: PulseEvent[]) => {

        const search = filter.search?.trim().toLocaleLowerCase();

        return events.filter(
            (e) => 
              (filter.poleId == null || e.poleId === filter.poleId) &&
              (filter.creatorId == null || e.creatorId === filter.creatorId) &&
              (filter.eventTypeId == null || e.eventTypeId === filter.eventTypeId) &&
              (filter.status == null || e.status === filter.status) &&
              (!filter.startFrom || e.startAt >= filter.startFrom) &&
              (!filter.startTo || e.startAt <= filter.startTo) &&
              (!search ||
                `${e.title} ${e.description ?? ''} ${e.locationName ?? ''}`
                  .toLowerCase()
                  .includes(search))
          ).sort((a, b) => a.startAt.localeCompare(b.startAt))
      })
    )
  }

  getEventsCreatedByCurrentUser(): Observable<PulseEvent[]> {
    return this.auth.loadCurrentUser().pipe(
      switchMap((user) =>
        this.http.get<PulseEvent[]>(`${this.apiEventUrl}/getEventsByCreatorId/${user.id}`)
      )
    );
  }

  getEvent(id: number): Observable<PulseEvent> {
    return this.http.get<PulseEvent>(`${this.apiEventUrl}/${id}`);
  }

  create(request: EventRequest): Observable<PulseEvent> {
    console.log("request", request)

    this.validate(request);

    return this.http.post<PulseEvent>(`${this.apiEventUrl}/create`, request);

  }

  update(id: number, request: EventRequest): Observable<PulseEvent> {
    console.log("request", request)
    request.id = id;
    this.validate(request);
    return this.http.put<PulseEvent>(`${this.apiEventUrl}/update/${id}`, request);
  }

  updateStatus(id: number, status: PulseEvent['status']): Observable<PulseEvent> {
    const params = new HttpParams()
      .set('id', id)
      .set('status', status);

    return this.http.put<PulseEvent>(`${this.apiEventUrl}/updateStatus/${id}/${status}`, null, {params});
    
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiEventUrl}/delete/${id}`);
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
          throw new ApiError([`L'évènement est complet`]);
        }
        if (new Date(event.rsvpDeadline) < new Date()) {
          throw new ApiError([`La date limite d'inscription est dépassée`]);
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
    const event = this.eventsMock.find((e) => e.id === id);
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
      locationName: r.locationName,
      address: r.address,
      onlineUrl: r.onlineUrl,
      capacity: r.capacity,
      rsvpDeadline: r.rsvpDeadline,
      status: r.status,
      participants: null
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
    if (errors.length) {
      throw new ApiError(errors);
    }
  }
}
