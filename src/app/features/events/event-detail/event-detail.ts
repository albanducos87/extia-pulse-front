import { DatePipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, map, switchMap, tap } from 'rxjs';
import { EventStatus, PulseEvent } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EventService, Participation } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon';
import { StatusLabelPipe } from '../../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe, Icon, StatusLabelPipe],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly event = signal<PulseEvent | null>(null);
  protected readonly participation = signal<Participation>({ count: 0, registered: false });
  protected readonly isRegistered = signal<boolean>;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly canEdit = computed(() => {
    const event = this.event();
    return !!event && this.auth.canEdit(event);
  });
  protected readonly isPast = computed(() => {
    const event = this.event();
    return !!event && new Date(event.endAt ?? event.startAt) < new Date();
  });
  protected readonly rsvpClosed = computed(() => {
    const event = this.event();
    return !!event && new Date(event.rsvpDeadline) < new Date();
  });
  protected readonly isFull = computed(() => {
    const capacity = this.event()?.capacity;
    return capacity != null && this.participation().count >= capacity;
  });
  protected readonly fillRate = computed(() => {
    const participants = this.event()?.participants;
    const capacity = this.event()?.capacity;
    return capacity && participants ? Math.min(100, (participants.length / capacity) * 100) : 0;
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.loading.set(true)),
        switchMap((params) => {
          const id = Number(params.get('id'));
          return this.eventService.getEvent(id)
        }),
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

  protected isUserRegistered(): boolean {
    const event = this.event();
    return !!event && this.auth.isUserRegistered(event);
  }

  protected registerUser(): void {
    this.busy.set(true);
    const event = this.event()!;
    const user = this.auth.currentUser()!;

    this.eventService.registerUserToEvent(event.id, user.id).pipe(
      switchMap(() => this.eventService.getEvent(event.id)),
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: updated => {
        this.event.set(updated);
        this.toast.success('Inscription confirmée')
      },
      error: () => this.toast.error(`Impossible de s'inscrire`)
    });
    
  }

  protected deregisterUser(): void {
    
    const event = this.event()!;
    const user = this.auth.currentUser()!;

    this.eventService.deregisterUserToEvent(event.id, user.id).pipe(
      switchMap(() => this.eventService.getEvent(event.id)),
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: updated => {
        this.event.set(updated);
        this.toast.success('Désinscription confirmée')
      },
      error: () => this.toast.error(`Impossible de se désinscrire`)
    });
    
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

  protected addParticipant(): void {
    const event = this.event()!;
    
  }

  protected async changeStatus(status: EventStatus): Promise<void> {
    const event = this.event()!;
    if (status === 'CANCELLED') {
      const ok = await this.confirm.ask({
        title: "Annuler l'évènement ?",
        message: `« ${event.title} » sera marqué comme annulé pour tous les participants.`,
        confirmLabel: "Annuler l'évènement",
        danger: true,
      });
      if (!ok) return;
    }
    this.busy.set(true);
    this.eventService.updateStatus(event.id, status).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.busy.set(false);
        this.toast.success(status === 'PUBLISHED' ? 'Évènement publié' : 'Évènement annulé');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err);
      },
    });
  }

  protected async delete(): Promise<void> {
    const event = this.event()!;
    const ok = await this.confirm.ask({
      title: "Supprimer l'évènement ?",
      message: `« ${event.title} » sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
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
}
