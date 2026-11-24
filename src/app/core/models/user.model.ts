import { Pole } from './pole.model';

export type UserRole = 'ADMIN' | 'USER';

/** Mirrors the backend AppUserDto (+ active flag from the entity). */
export interface AppUser {
  id: number;
  pole: Pole;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
}

/** Mirrors the query params of GET /api/user. */
export interface UserFilter {
  poleId?: number | null;
  role?: UserRole | null;
  active?: boolean | null;
  search?: string | null;
}

export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'USER'];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  USER: 'Utilisateur',
};
