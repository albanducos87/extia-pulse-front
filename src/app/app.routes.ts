import { Routes } from '@angular/router';
import { adminGuard, authGuard, eventManagerGuard, guestGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion · Extia Pulse',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Tableau de bord · Extia Pulse',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'events',
        title: 'Évènements · Extia Pulse',
        loadComponent: () =>
          import('./features/events/event-list/event-list').then((m) => m.EventList),
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
