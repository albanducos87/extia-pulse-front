import { Injectable, computed, inject, signal } from '@angular/core';
import { AppUser } from '../models/user.model';
import { PulseEvent } from '../models/event.model';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.dev';
import { Observable, shareReplay, tap } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Mock authentication. To be replaced by the Cognito integration:
 * login/logout will delegate to Cognito and the current user will be
 * resolved from the JWT subject.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private userRequest$?: Observable<AppUser>;

  private readonly user = signal<AppUser | null>(null);
  readonly currentUser = this.user.asReadonly();

  readonly canManageEvents = computed(() => {
    const role = this.user()?.role;
    return role === 'ADMIN';
  });

  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  canEdit(event: PulseEvent): boolean {
    const user = this.user();
    return !!user && (user.role === 'ADMIN' || user.id === event.creatorId);
  }

  isUserRegistered(event: PulseEvent): boolean {
    const user = this.user();
    return !!user && !!event.participants?.some((p) => p.id === user.id);
  }

  loadCurrentUser(): Observable<AppUser> {
    this.userRequest$ ??= this.http.get<AppUser>(`${environment.apiUrl}/user/currentUser`).pipe(
      tap((user) => this.user.set(user)),
      shareReplay(1)
    );
    return this.userRequest$;
  }

  init(): void {
    this.oidc.checkAuth().subscribe(({ isAuthenticated }) => {
      if (isAuthenticated) {
        this.loadCurrentUser().subscribe();
        if (this.router.url.startsWith('/callback')) {
          this.router.navigateByUrl('/');
        }
      }
    });
  }

  logout(): void {
    this.oidc.logoffLocal();
    const { domain, clientId } = environment.cognito;
    window.location.href = 
      `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(window.location.origin)}`;
  }

  setCurrentUser(user: AppUser): void {
    this.user.set(user);
  }
}
