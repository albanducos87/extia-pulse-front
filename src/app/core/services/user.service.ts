import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { AppUser, UserFilter } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment.dev';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  getUsers(filter: UserFilter = {}): Observable<AppUser[]> {

    return this.http.get<AppUser[]>(`${environment.apiUrl}/user`).pipe(
      map((users: AppUser[]) => {
        
        const search = filter.search?.trim().toLowerCase();
        return users.filter(
          (u) => 
            (filter.poleId == null || u.pole.id === filter.poleId) &&
            (filter.role == null || u.role === filter.role) &&
            (filter.active == null || u.active === filter.active) &&
            (!search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search))
        );
      })
    );
  }

  /** Admin update: name, email, role, pole and active flag. */
  update(user: AppUser): Observable<AppUser> {
    return this.http.put<AppUser>(`${environment.apiUrl}/user/update/${user.id}`, user).pipe(
      tap((updated) => {
        // Keep the session in sync if the admin edited their own account.
        if (updated.id === this.auth.currentUser()?.id) this.auth.setCurrentUser(updated);
      }),
    );
  }

  // --- Profil de l'utilisateur connecté : branché sur le back ---
  updateProfile(current: AppUser, changes: { firstName: string; lastName: string }): Observable<AppUser> {
    const body = {
      id: current.id,
      pole: current.pole,
      email: current.email,
      role: current.role,
      active: current.active,
      ...changes,
    };

    console.log("body", body)

    return this.http
      .put<AppUser>(`${environment.apiUrl}/user/update/${current.id}`, body)
      .pipe(tap((user) => this.auth.setCurrentUser(user)));
  }
}