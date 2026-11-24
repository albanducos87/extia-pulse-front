import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventFilter, EventRequest, EventStatus, PulseEvent } from '../models/event.model';
import { byStartDate } from '../utils/event.utils';
import { AuthService } from './auth.service';
import { fileNameFromDisposition } from '../utils/download.utils';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly eventsUrl = `${environment.apiUrl}/events`;
  private readonly participationUrl = `${environment.apiUrl}/participation`;

  /** All events visible to the user, filtered client-side and sorted by start date. */
  getEvents(filter: EventFilter = {}): Observable<PulseEvent[]> {
    return this.http
      .get<PulseEvent[]>(this.eventsUrl)
      .pipe(map((events) => events.filter((e) => matchesFilter(e, filter)).sort(byStartDate)));
  }

  getEventsCreatedByCurrentUser(): Observable<PulseEvent[]> {
    return this.auth
      .loadCurrentUser()
      .pipe(
        switchMap((user) =>
          this.http.get<PulseEvent[]>(`${this.eventsUrl}/getEventsByCreatorId/${user.id}`),
        ),
      );
  }

  getEvent(id: number): Observable<PulseEvent> {
    return this.http.get<PulseEvent>(`${this.eventsUrl}/${id}`);
  }

  create(request: EventRequest): Observable<PulseEvent> {
    return this.http.post<PulseEvent>(`${this.eventsUrl}/create`, request);
  }

  update(id: number, request: EventRequest): Observable<PulseEvent> {
    return this.http.put<PulseEvent>(`${this.eventsUrl}/update/${id}`, { ...request, id });
  }

  updateStatus(id: number, status: EventStatus): Observable<PulseEvent> {
    const params = new HttpParams().set('id', id).set('status', status);
    return this.http.put<PulseEvent>(`${this.eventsUrl}/updateStatus/${id}/${status}`, null, {
      params,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.eventsUrl}/delete/${id}`);
  }

  register(eventId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.participationUrl}/${eventId}/${userId}`, null);
  }

  unregister(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.participationUrl}/${eventId}/${userId}`);
  }

  downloadIcs(eventId: number): Observable<{ blob: Blob, fileName: string}> {
    return this.http
      .get(`${this.eventsUrl}/${eventId}/ics`, { responseType: 'blob', observe: 'response' })
      .pipe(
        map((res) => ({
          blob: res.body!,
          fileName: fileNameFromDisposition(
            res.headers.get('Content-Disposition'),
            `evenement-${eventId}.ics`
          )
        }))
      )
  }
}

function matchesFilter(event: PulseEvent, filter: EventFilter): boolean {
  const search = filter.search?.trim().toLowerCase();
  const searchable = `${event.title} ${event.description ?? ''} ${event.locationName ?? ''}`;
  return (
    (filter.poleId == null || event.poleId === filter.poleId) &&
    (filter.creatorId == null || event.creatorId === filter.creatorId) &&
    (filter.eventTypeId == null || event.eventTypeId === filter.eventTypeId) &&
    (filter.status == null || event.status === filter.status) &&
    (!filter.startFrom || event.startAt >= filter.startFrom) &&
    (!filter.startTo || event.startAt <= filter.startTo) &&
    (!search || searchable.toLowerCase().includes(search))
  );
}


