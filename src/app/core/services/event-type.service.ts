import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MOCK_EVENT_TYPES } from '../data/mock-data';
import { EventType } from '../models/event-type.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.dev';

@Injectable({ providedIn: 'root' })
export class EventTypeService {
  private readonly http = inject(HttpClient);

  private types: EventType[] = [...MOCK_EVENT_TYPES];

  getAllEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(`${environment.apiUrl}/event-types`);
  }

  create(code: string, label: string): Observable<EventType> {
    const params = new HttpParams()
      .set('code', code)
      .set('label', label);

    return this.http.post<EventType>(`${environment.apiUrl}/event-types/create`, null, {params});
    
  }

  update(id: number, code: string, label: string): Observable<EventType> {
    const params = new HttpParams()
      .set('id', id)
      .set('code', code)
      .set('label', label);

    return this.http.put<EventType>(`${environment.apiUrl}/event-types/update`, null, {params}).pipe(
      tap((updated) => {
        this.types = this.types.map((t) => (t.id === updated.id ? updated : t));
        return updated;
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/event-types/delete/${id}`).pipe(
      tap(() => {
        this.types = this.types.filter((t) => t.id !== id);
      })
    );
    
  }
}
