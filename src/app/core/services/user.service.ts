import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, UserFilter } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/user`;

  /** All users, filtered client-side. */
  getUsers(filter: UserFilter = {}): Observable<AppUser[]> {
    return this.http
      .get<AppUser[]>(this.url)
      .pipe(map((users) => users.filter((u) => matchesFilter(u, filter))));
  }

  /** Admin update: name, email, role, pole and active flag. */
  update(user: AppUser): Observable<AppUser> {
    return this.http.put<AppUser>(`${this.url}/update/${user.id}`, user).pipe(
      // Keep the session in sync if the admin edited their own account.
      tap((updated) => {
        if (updated.id === this.auth.currentUser()?.id) this.auth.setCurrentUser(updated);
      }),
    );
  }

  /** Current user's own profile: only the name can be changed. */
  updateProfile(
    current: AppUser,
    changes: Pick<AppUser, 'firstName' | 'lastName'>,
  ): Observable<AppUser> {
    return this.update({ ...current, ...changes });
  }
}

function matchesFilter(user: AppUser, filter: UserFilter): boolean {
  const search = filter.search?.trim().toLowerCase();
  const searchable = `${user.firstName} ${user.lastName} ${user.email}`;
  return (
    (filter.poleId == null || user.pole.id === filter.poleId) &&
    (filter.role == null || user.role === filter.role) &&
    (filter.active == null || user.active === filter.active) &&
    (!search || searchable.toLowerCase().includes(search))
  );
}
