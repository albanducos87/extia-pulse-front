import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from './shared/components/confirm-dialog';
import { ToastContainer } from './shared/components/toast-container';
import { AuthService } from './core/services/auth.service';

@Component({
  imports: [RouterOutlet, ToastContainer, ConfirmDialog],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.init();
  }
}
