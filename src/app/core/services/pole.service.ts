import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MOCK_POLES } from '../data/mock-data';
import { Pole } from '../models/pole.model';
import { mockResponse } from './mock-http';

@Injectable({ providedIn: 'root' })
export class PoleService {
  // TODO: no pole endpoint exists in eventApi yet.
  getPoles(): Observable<Pole[]> {
    return mockResponse(() => MOCK_POLES);
  }
}
