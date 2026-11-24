import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RoleLabelPipe],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  protected readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.form.setValue({ firstName: user.firstName, lastName: user.lastName });
      }
    });
  }

  protected showError(name: 'firstName' | 'lastName'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected save(): void {
    const current = this.auth.currentUser();
    if (!current || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.userService.updateProfile(current, this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Profil mis à jour');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err);
      },
    });
  }
}
