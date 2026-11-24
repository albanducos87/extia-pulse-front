import { PulseEvent } from './event.model';
import { AppUser } from './user.model';

export type InvitationAction = 'accept' | 'decline';

/**
 * Mirrors the backend InvitationDto.
 * Only pending invitations exist: the backend deletes an invitation once it is answered.
 */
export interface Invitation {
  id: number;
  event: PulseEvent;
  user: AppUser;
}
