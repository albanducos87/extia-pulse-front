import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirm.answer(false)' },
  template: `
    @if (confirm.pending(); as request) {
      <div class="backdrop" (click)="confirm.answer(false)"></div>
      <div class="modal" role="alertdialog" aria-modal="true" [attr.aria-label]="request.title">
        <h2>{{ request.title }}</h2>
        <p>{{ request.message }}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" (click)="confirm.answer(false)">Annuler</button>
          <button
            class="btn"
            type="button"
            [class.btn-danger]="request.danger"
            [class.btn-primary]="!request.danger"
            (click)="confirm.answer(true)"
          >
            {{ request.confirmLabel ?? 'Confirmer' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
}
