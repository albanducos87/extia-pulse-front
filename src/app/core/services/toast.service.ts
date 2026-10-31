import { Injectable, signal } from '@angular/core';
import { ApiError } from './mock-http';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  error(errorOrMessage: unknown): void {
    const message =
      errorOrMessage instanceof ApiError
        ? errorOrMessage.errors.join(' · ')
        : typeof errorOrMessage === 'string'
          ? errorOrMessage
          : 'Une erreur inattendue est survenue';
    this.show('error', message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(kind: Toast['kind'], message: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
