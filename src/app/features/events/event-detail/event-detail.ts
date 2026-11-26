import { DatePipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  filter,
  finalize,
  forkJoin,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { EventStatus, PulseEvent } from '../../../core/models/event.model';
import { Invitation } from '../../../core/models/invitation.model';
import { AppUser } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EventService } from '../../../core/services/event.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { isEventFull, isEventPast, isRsvpClosed } from '../../../core/utils/event.utils';
import { Icon } from '../../../shared/components/icon';
import { StatusLabelPipe } from '../../../shared/pipes/labels.pipe';
import { downloadBlob } from '../../../core/utils/download.utils';

const MAX_INVITE_SUGGESTIONS = 8;

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'showParticipants.set(false)' },
})
export class EventDetail {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly invitationService = inject(InvitationService);
  private readonly userService = inject(UserService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly event = signal<PulseEvent | null>(null);
  protected readonly loading = signal(true);
  /** An action (registration, status change, deletion) is in flight. */
  protected readonly busy = signal(false);
  protected readonly showParticipants = signal(false);

  protected readonly canEdit = computed(() => this.check((e) => this.auth.canEdit(e)));
  protected readonly isRegistered = computed(() =>
    this.check((e) => this.auth.isUserRegistered(e)),
  );
  protected readonly isPast = computed(() => this.check(isEventPast));
  protected readonly rsvpClosed = computed(() => this.check(isRsvpClosed));
  protected readonly isFull = computed(() => this.check(isEventFull));
  /** Percentage of seats taken, for the progress bar. */
  protected readonly fillRate = computed(() => {
    const event = this.event();
    if (!event?.capacity) return 0;
    return Math.min(100, (event.participants.length / event.capacity) * 100);
  });

  // --- Invitations (organiser / admin only) ---
  protected readonly canInvite = computed(() =>
    this.check((e) => this.auth.canEdit(e) && e.status !== 'CANCELLED' && !isEventPast(e)),
  );
  /** Loaded lazily, only once the user is allowed to invite. */
  private readonly users = toSignal(
    toObservable(this.canInvite).pipe(
      filter(Boolean),
      take(1),
      switchMap(() => this.userService.getUsers({ active: true })),
    ),
    { initialValue: [] as AppUser[] },
  );
  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly inviting = signal(false);
  protected readonly inviteSearch = signal('');
  /** Users picked in the search box, not invited until the organiser sends them. */
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly pendingInvitations = computed(() =>
    this.invitations().filter((i) => i.status === 'PENDING'),
  );
  /** Users who can still be invited: not the organiser, not already invited nor participating. */
  private readonly invitableUsers = computed(() => {
    const event = this.event();
    if (!event) return [];
    const excluded = new Set([
      event.creatorId,
      ...event.participants.map((p) => p.id),
      ...this.invitations().map((i) => i.user.id),
    ]);
    return this.users().filter((u) => !excluded.has(u.id));
  });
  protected readonly selectedUsers = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.invitableUsers().filter((u) => ids.has(u.id));
  });
  protected readonly inviteCandidates = computed(() => {
    const search = this.inviteSearch().trim().toLowerCase();
    if (!search) return [];
    const selected = new Set(this.selectedIds());
    return this.invitableUsers()
      .filter(
        (u) =>
          !selected.has(u.id) &&
          `${u.firstName} ${u.lastName} ${u.email} ${u.pole?.name ?? ''}`
            .toLowerCase()
            .includes(search),
      )
      .slice(0, MAX_INVITE_SUGGESTIONS);
  });
  protected readonly unselectedPoleMembers = computed(() => {
    const poleId = this.event()?.poleId;
    const selected = new Set(this.selectedIds());
    return this.invitableUsers().filter((u) => u.pole?.id === poleId && !selected.has(u.id));
  });
  /** Seats left once participants, pending invitations and the selection are counted (null = unlimited). */
  protected readonly remainingInvites = computed(() => {
    const event = this.event();
    if (!event?.capacity) return null;
    return Math.max(
      0,
      event.capacity -
        event.participants.length -
        this.pendingInvitations().length -
        this.selectedUsers().length,
    );
  });
  protected readonly invitesFull = computed(() => this.remainingInvites() === 0);
  protected readonly canSelectWholePole = computed(() => {
    const remaining = this.remainingInvites();
    return remaining === null || this.unselectedPoleMembers().length <= remaining;
  });

  constructor() {
    toObservable(this.canInvite)
      .pipe(
        filter(Boolean),
        switchMap(() => this.loadInvitations()),
        takeUntilDestroyed(),
      )
      .subscribe();

    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.loading.set(true)),
        switchMap((params) => this.eventService.getEvent(Number(params.get('id')))),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (event) => {
          this.event.set(event);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.error(err);
          this.router.navigate(['/events'], { replaceUrl: true });
        },
      });
  }

  protected register(): void {
    this.updateRegistration(
      (eventId, userId) => this.eventService.register(eventId, userId),
      'Inscription confirmée',
      "Impossible de s'inscrire",
    );
  }

  protected unregister(): void {
    this.updateRegistration(
      (eventId, userId) => this.eventService.unregister(eventId, userId),
      'Désinscription confirmée',
      'Impossible de se désinscrire',
    );
  }

  protected goBack(domEvent: MouseEvent): void {
    domEvent.preventDefault();
    // Fall back to the list when the page was opened directly (no in-app history).
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigate(['/events'], { replaceUrl: true });
    }
  }

  protected async changeStatus(status: EventStatus): Promise<void> {
    const event = this.event()!;
    if (status === 'CANCELLED') {
      const confirmed = await this.confirm.ask({
        title: "Annuler l'évènement ?",
        message: `« ${event.title} » sera marqué comme annulé pour tous les participants.`,
        confirmLabel: "Annuler l'évènement",
        danger: true,
      });
      if (!confirmed) return;
    }
    this.busy.set(true);
    this.eventService
      .updateStatus(event.id, status)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          this.toast.success(status === 'PUBLISHED' ? 'Évènement publié' : 'Évènement annulé');
        },
        error: (err) => this.toast.error(err),
      });
  }

  protected async delete(): Promise<void> {
    const event = this.event()!;
    const confirmed = await this.confirm.ask({
      title: "Supprimer l'évènement ?",
      message: `« ${event.title} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.eventService.delete(event.id).subscribe({
      next: () => {
        this.toast.success('Évènement supprimé');
        this.router.navigate(['/events'], { replaceUrl: true });
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }

  protected exportToCalendar(): void {
    const event = this.event()!;
    this.eventService.downloadIcs(event.id).subscribe({
      next: ({ blob, fileName }) => downloadBlob(blob, fileName),
      error: () => this.toast.error("Impossible d'exporter l'évènement"),
    });
  }

  protected select(users: AppUser[]): void {
    const remaining = this.remainingInvites();
    if (!users.length || (remaining !== null && users.length > remaining)) return;
    this.selectedIds.update((ids) => [
      ...ids,
      ...users.map((u) => u.id).filter((id) => !ids.includes(id)),
    ]);
    this.inviteSearch.set('');
  }

  protected unselect(user: AppUser): void {
    this.selectedIds.update((ids) => ids.filter((id) => id !== user.id));
  }

  protected clearSelection(): void {
    this.selectedIds.set([]);
  }

  protected sendInvitations(): void {
    const users = this.selectedUsers();
    if (!users.length) return;
    const eventId = this.event()!.id;
    this.inviting.set(true);
    forkJoin(users.map((u) => this.invitationService.invite(eventId, u.id)))
      .pipe(finalize(() => this.inviting.set(false)))
      .subscribe({
        next: () => {
          this.selectedIds.set([]);
          this.toast.success(
            users.length > 1 ? `${users.length} invitations envoyées` : 'Invitation envoyée',
          );
          this.loadInvitations().subscribe();
        },
        error: (err) => {
          this.toast.error(err);
          // Some invitations may have gone through before the failure: those leave the
          // selection automatically once reloaded (invited users are no longer invitable).
          this.loadInvitations().subscribe();
        },
      });
  }

  /** Enter in the search box selects the first suggestion. */
  protected onInviteEnter(domEvent: Event): void {
    domEvent.preventDefault();
    const first = this.inviteCandidates()[0];
    if (first) this.select([first]);
  }

  private loadInvitations(): Observable<Invitation[]> {
    return this.invitationService.getEventInvitations(this.event()!.id).pipe(
      tap((list) => this.invitations.set(list)),
      catchError(() => EMPTY),
    );
  }

  /** Evaluates a predicate on the loaded event (false while loading). */
  private check(predicate: (event: PulseEvent) => boolean): boolean {
    const event = this.event();
    return !!event && predicate(event);
  }

  /** Runs a (un)registration call, then reloads the event to refresh the participant list. */
  private updateRegistration(
    action: (eventId: number, userId: number) => Observable<void>,
    successMessage: string,
    errorMessage: string,
  ): void {
    const eventId = this.event()!.id;
    const userId = this.auth.currentUser()!.id;
    this.busy.set(true);
    action(eventId, userId)
      .pipe(
        switchMap(() => this.eventService.getEvent(eventId)),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          this.toast.success(successMessage);
        },
        error: () => this.toast.error(errorMessage),
      });
  }
}
