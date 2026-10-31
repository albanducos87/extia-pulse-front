export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

/** Mirrors the backend AppUserDto (+ active flag from the entity). */
export interface AppUser {
  id: number;
  poleId: number;
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

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  EMPLOYEE: 'Collaborateur',
};
