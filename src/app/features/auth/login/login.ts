import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MOCK_USERS } from '../../../core/data/mock-data';
import { AuthService } from '../../../core/services/auth.service';
import { ApiError } from '../../../core/services/mock-http';
import { Icon } from '../../../shared/components/icon';
import { RoleLabelPipe } from '../../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon, RoleLabelPipe],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  /** One demo account per role, to try the role-based UI. */
  protected readonly demoAccounts = (['ADMIN', 'MANAGER', 'EMPLOYEE'] as const).map(
    (role) => MOCK_USERS.find((u) => u.role === role && u.active)!,
  );

  protected useDemo(email: string): void {
    this.form.setValue({ email, password: 'demo' });
    this.submit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error.set(err instanceof ApiError ? err.message : 'Connexion impossible');
        this.submitting.set(false);
      },
    });
  }
}
