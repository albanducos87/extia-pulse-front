import { PulseEvent } from './event.model';
import { AppUser } from './user.model';

export type InvitationAction = 'accept' | 'decline';
export type InvitationStatus = 'PENDING' | 'ACCEPTED';

/**
 * Mirrors the backend InvitationDto.
 * A declined invitation is deleted by the backend; an accepted one is kept as ACCEPTED.
 */
export interface Invitation {
  id: number;
  event: PulseEvent;
  user: AppUser;
  status: InvitationStatus;
}
