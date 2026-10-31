import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MOCK_USERS } from '../data/mock-data';
import { AppUser, UserFilter } from '../models/user.model';
import { mockResponse } from './mock-http';

/** In-memory stand-in for /api/user. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private users: AppUser[] = [...MOCK_USERS];

  getUsers(filter: UserFilter = {}): Observable<AppUser[]> {
    return mockResponse(() => {
      const search = filter.search?.trim().toLowerCase();
      return this.users.filter(
        (u) =>
          (filter.poleId == null || u.poleId === filter.poleId) &&
          (filter.role == null || u.role === filter.role) &&
          (filter.active == null || u.active === filter.active) &&
          (!search ||
            `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search)),
      );
    });
  }

  update(user: AppUser): Observable<AppUser> {
    return mockResponse(() => {
      this.users = this.users.map((u) => (u.id === user.id ? user : u));
      return user;
    });
  }
}
