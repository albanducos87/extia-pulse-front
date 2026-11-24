import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .loadCurrentUser()
    .pipe(map(() => (auth.isAdmin() ? true : router.createUrlTree(['/']))));
};

export const eventManagerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .loadCurrentUser()
    .pipe(map(() => (auth.canManageEvents() ? true : router.createUrlTree(['/']))));
};
