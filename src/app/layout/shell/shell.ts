import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InvitationService } from '../../core/services/invitation.service';
import { Icon, IconName } from '../../shared/components/icon';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
  badge?: number;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, RoleLabelPipe],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly invitations = inject(InvitationService);

  protected readonly menuOpen = signal(false);

  constructor() {
    // Lock page scroll while the mobile drawer is open.
    const body = inject(DOCUMENT).body;
    effect(() => body.classList.toggle('no-scroll', this.menuOpen()));

    // Close the drawer after any navigation (links, back button, redirects).
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));

    // Feed the pending-invitations badge; failures are silent (the page shows its own error).
    this.invitations.loadMyInvitations().subscribe({ error: () => {} });
  }

  protected readonly navItems = computed<NavItem[]>(() => [
    { label: 'Tableau de bord', path: '/', icon: 'grid', exact: true },
    { label: 'Évènements', path: '/events', icon: 'calendar', exact: true },
    {
      label: 'Invitations',
      path: '/invitations',
      icon: 'mail',
      badge: this.invitations.pendingCount(),
    },
    { label: 'Créer un évènement', path: '/events/new', icon: 'plus' as const }
  ]);

  protected readonly adminItems: NavItem[] = [
    { label: "Types d'évènements", path: '/admin/event-types', icon: 'tag' },
    { label: 'Utilisateurs', path: '/admin/users', icon: 'users' },
  ];

  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.firstName[0]}${user.lastName[0]}` : '';
  });

  protected readonly poleName = computed(() => this.auth.currentUser()?.pole?.name ?? '');

  protected logout(): void {
    this.auth.logout();
  }
}
