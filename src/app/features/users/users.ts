import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, startWith, switchMap, tap } from 'rxjs';
import { AppUser, USER_ROLE_LABELS, UserRole } from '../../core/models/user.model';
import { PoleService } from '../../core/services/pole.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { Icon } from '../../shared/components/icon';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, Icon, RoleLabelPipe],
  templateUrl: './users.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'editing.set(null)' },
})
export class Users {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly poles = toSignal(inject(PoleService).getPoles(), { initialValue: [] });
  protected readonly roleOptions = Object.entries(USER_ROLE_LABELS) as [UserRole, string][];
  private readonly poleNames = computed(
    () => new Map(this.poles().map((p) => [p.id, p.name] as const)),
  );

  protected readonly filters = this.fb.group({
    search: [''],
    poleId: [null as number | null],
    role: [null as UserRole | null],
    active: [null as boolean | null],
  });

  protected readonly users = signal<AppUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly editing = signal<AppUser | null>(null);
  protected readonly saving = signal(false);

  protected readonly editForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    poleId: [0, Validators.required],
    role: ['EMPLOYEE' as UserRole, Validators.required],
  });

  constructor() {
    this.filters.valueChanges
      .pipe(
        startWith(this.filters.value),
        debounceTime(200),
        tap(() => this.loading.set(true)),
        switchMap(() => this.userService.getUsers(this.filters.getRawValue())),
        takeUntilDestroyed(),
      )
      .subscribe((users) => {
        this.users.set(users);
        this.loading.set(false);
      });
  }

  protected poleName(id: number): string {
    return this.poleNames().get(id) ?? '—';
  }

  protected openEdit(user: AppUser): void {
    this.editing.set(user);
    this.editForm.setValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      poleId: user.poleId,
      role: user.role,
    });
  }

  protected save(): void {
    const user = this.editing();
    if (!user || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.userService.update({ ...user, ...this.editForm.getRawValue() }).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success('Utilisateur mis à jour');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err);
      },
    });
  }
}
