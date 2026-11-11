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
    let message = 'Une erreur inattendue est survenue';

    if (errorOrMessage instanceof ApiError) {
      message = errorOrMessage.errors.join(' · ');
    } else if (typeof errorOrMessage === 'string') {
      message = errorOrMessage; 
    } else if (typeof errorOrMessage === 'object' && errorOrMessage !== null) {
      const body = (errorOrMessage as any).error;
      message = typeof body === 'string' ? body : body?.detail ?? body?.message ?? message;
    } 
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
