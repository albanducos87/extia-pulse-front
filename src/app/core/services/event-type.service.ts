import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventType } from '../models/event-type.model';

@Injectable({ providedIn: 'root' })
export class EventTypeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/event-types`;

  getAllEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(this.url);
  }

  create(code: string, label: string): Observable<EventType> {
    const params = new HttpParams().set('code', code).set('label', label);
    return this.http.post<EventType>(`${this.url}/create`, null, { params });
  }

  update(id: number, code: string, label: string): Observable<EventType> {
    const params = new HttpParams().set('id', id).set('code', code).set('label', label);
    return this.http.put<EventType>(`${this.url}/update`, null, { params });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/delete/${id}`);
  }
}
