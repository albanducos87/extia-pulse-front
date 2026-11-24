import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Invitation, InvitationAction } from '../../core/models/invitation.model';
import { InvitationService } from '../../core/services/invitation.service';
import { ToastService } from '../../core/services/toast.service';
import { byStartDate, isEventFull, isEventPast } from '../../core/utils/event.utils';
import { Icon } from '../../shared/components/icon';

@Component({
  selector: 'app-invitations',
  imports: [RouterLink, DatePipe, Icon],
  templateUrl: './invitations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Invitations {
  private readonly invitationService = inject(InvitationService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly busyId = signal<number | null>(null);

  protected readonly invitations = computed(() =>
    [...this.invitationService.myInvitations()].sort((a, b) => byStartDate(a.event, b.event)),
  );

  constructor() {
    this.invitationService
      .loadMyInvitations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: () => this.toast.error('Impossible de charger vos invitations') });
  }

  protected isPast(invitation: Invitation): boolean {
    return isEventPast(invitation.event);
  }

  protected isFull(invitation: Invitation): boolean {
    return isEventFull(invitation.event);
  }

  protected respond(invitation: Invitation, action: InvitationAction): void {
    this.busyId.set(invitation.id);
    this.invitationService
      .respond(invitation.event.id, action)
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: () =>
          this.toast.success(action === 'accept' ? 'Invitation acceptée' : 'Invitation refusée'),
        error: () => this.toast.error("Impossible de répondre à l'invitation"),
      });
  }
}
