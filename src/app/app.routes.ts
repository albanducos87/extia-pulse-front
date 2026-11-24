import { Routes } from '@angular/router';
import { eventManagerGuard, adminGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell/shell';
import { autoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

export const routes: Routes = [
  {
    path: 'callback',
    loadComponent: () => import('./features/auth/callback/callback').then((m) => m.Callback),
  },
  {
    path: '',
    component: Shell,
    canActivate: [autoLoginPartialRoutesGuard],
    canActivateChild: [autoLoginPartialRoutesGuard],
    children: [
      {
        path: '',
        title: 'Tableau de bord · Extia Pulse',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'profile',
        title: 'Mon profil · Extia Pulse',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'events',
        title: 'Évènements · Extia Pulse',
        loadComponent: () =>
          import('./features/events/event-list/event-list').then((m) => m.EventList),
      },
      {
        path: 'invitations',
        title: 'Mes invitations · Extia Pulse',
        loadComponent: () =>
          import('./features/invitations/invitations').then((m) => m.Invitations),
      },
      {
        path: 'events/new',
        title: 'Nouvel évènement · Extia Pulse',
        canActivate: [eventManagerGuard],
        loadComponent: () =>
          import('./features/events/event-form/event-form').then((m) => m.EventForm),
      },
      {
        path: 'events/:id',
        title: 'Évènement · Extia Pulse',
        loadComponent: () =>
          import('./features/events/event-detail/event-detail').then((m) => m.EventDetail),
      },
      {
        path: 'events/:id/edit',
        title: "Modifier l'évènement · Extia Pulse",
        loadComponent: () =>
          import('./features/events/event-form/event-form').then((m) => m.EventForm),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'event-types',
            title: "Types d'évènements · Extia Pulse",
            loadComponent: () =>
              import('./features/event-types/event-types').then((m) => m.EventTypes),
          },
          {
            path: 'users',
            title: 'Utilisateurs · Extia Pulse',
            loadComponent: () => import('./features/users/users').then((m) => m.Users),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
