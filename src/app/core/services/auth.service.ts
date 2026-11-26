import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PulseEvent } from '../models/event.model';
import { AppUser } from '../models/user.model';

/**
 * Authentication through AWS Cognito (OIDC). The application user (role, pole…)
 * is then fetched from the backend and exposed as the `currentUser` signal.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly user = signal<AppUser | null>(null);
  readonly currentUser = this.user.asReadonly();
  /** Shared request so concurrent callers trigger a single HTTP call. */
  private currentUser$?: Observable<AppUser>;

  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  /** Any authenticated user can create events. */
  readonly canManageEvents = computed(() => !!this.user());

  /** Called once at startup: completes the OIDC flow and loads the application user. */
  init(): void {
    this.oidc.checkAuth().subscribe(({ isAuthenticated }) => {
      if (!isAuthenticated) return;
      this.loadCurrentUser().subscribe();
      if (this.router.url.startsWith('/callback')) {
        this.router.navigateByUrl('/');
      }
    });
  }

  loadCurrentUser(): Observable<AppUser> {
    this.currentUser$ ??= this.http.get<AppUser>(`${environment.apiUrl}/user/currentUser`).pipe(
      tap((user) => this.user.set(user)),
      shareReplay(1),
    );
    return this.currentUser$;
  }

  setCurrentUser(user: AppUser): void {
    this.user.set(user);
  }

  logout(): void {
    this.oidc.logoffLocal();
    const { domain, clientId } = environment.cognito;
    const logoutUri = encodeURIComponent(window.location.origin);
    window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  }

  /** The current user created this event. */
  isOrganiser(event: PulseEvent): boolean {
    const user = this.user();
    return !!user && user.id === event.creatorId;
  }

  isUserRegistered(event: PulseEvent): boolean {
    const user = this.user();
    return !!user && !!event.participants?.some((p) => p.id === user.id);
  }

  canEdit(event: PulseEvent): boolean {
    return this.isAdmin() || this.isOrganiser(event);
  }
}
