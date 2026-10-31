import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MOCK_EVENT_TYPES } from '../data/mock-data';
import { EventType } from '../models/event-type.model';
import { ApiError, mockResponse } from './mock-http';

/** In-memory stand-in for /api/event-types. */
@Injectable({ providedIn: 'root' })
export class EventTypeService {
  private types: EventType[] = [...MOCK_EVENT_TYPES];
  private nextId = Math.max(...this.types.map((t) => t.id)) + 1;

  getAll(): Observable<EventType[]> {
    return mockResponse(() => this.types);
  }

  create(code: string, label: string): Observable<EventType> {
    return mockResponse(() => {
      this.assertCodeIsFree(code);
      const created = { id: this.nextId++, code, label };
      this.types = [...this.types, created];
      return created;
    });
  }

  update(type: EventType): Observable<EventType> {
    return mockResponse(() => {
      this.assertCodeIsFree(type.code, type.id);
      this.types = this.types.map((t) => (t.id === type.id ? type : t));
      return type;
    });
  }

  delete(id: number): Observable<void> {
    return mockResponse(() => {
      this.types = this.types.filter((t) => t.id !== id);
    });
  }

  private assertCodeIsFree(code: string, exceptId?: number): void {
    if (this.types.some((t) => t.code === code && t.id !== exceptId)) {
      throw new ApiError([`Le code « ${code} » existe déjà`]);
    }
  }
}
