import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MOCK_USERS } from '../data/mock-data';
import { PulseEvent } from '../models/event.model';
import { AppUser } from '../models/user.model';
import { ApiError, mockResponse } from './mock-http';

const STORAGE_KEY = 'pulse.mockUserId';

/**
 * Mock authentication. To be replaced by the Cognito integration:
 * login/logout will delegate to Cognito and the current user will be
 * resolved from the JWT subject.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<AppUser | null>(this.restoreUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly canManageEvents = computed(() => {
    const role = this.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  });

  login(email: string, _password: string): Observable<AppUser> {
    return mockResponse(() => {
      const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        throw new ApiError(['Identifiants invalides']);
      }
      if (!user.active) {
        throw new ApiError(['Ce compte est désactivé']);
      }
      sessionStorage.setItem(STORAGE_KEY, String(user.id));
      this.user.set(user);
      return user;
    });
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.user.set(null);
  }

  canEdit(event: PulseEvent): boolean {
    const user = this.user();
    return !!user && (user.role === 'ADMIN' || user.id === event.creatorId);
  }

  private restoreUser(): AppUser | null {
    const id = Number(sessionStorage.getItem(STORAGE_KEY));
    return MOCK_USERS.find((u) => u.id === id) ?? null;
  }
}
