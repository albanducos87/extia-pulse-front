import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invitation, InvitationAction } from '../models/invitation.model';
import { AuthService } from './auth.service';

/**
 * Backend contract:
 *  GET /api/invitation/user/{userId}          -> InvitationDto[]  (pending invitations only)
 *  PUT /api/invitation/{eventId}/{action}     -> answers the invitation (action = accept | decline)
 *                                                and deletes it.
 * Invitations themselves are created with the event (EventRequest.invitedUserIds).
 */
@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/invitation`;

  private readonly invitations = signal<Invitation[]>([]);
  readonly myInvitations = this.invitations.asReadonly();
  readonly pendingCount = computed(() => this.invitations().length);

  /** Loads the current user's pending invitations and caches them (used by the nav badge). */
  loadMyInvitations(): Observable<Invitation[]> {
    return this.auth.loadCurrentUser().pipe(
      switchMap((user) => this.http.get<Invitation[]>(`${this.apiUrl}/user/${user.id}`)),
      tap((list) => this.invitations.set(list)),
    );
  }

  /** Answers the invitation to the given event; the backend deletes it, so it leaves the list. */
  respond(eventId: number, action: InvitationAction): Observable<unknown> {
    return this.http
      .put(`${this.apiUrl}/${eventId}/${action}`, null)
      .pipe(
        tap(() => this.invitations.update((list) => list.filter((i) => i.event.id !== eventId))),
      );
  }
}
