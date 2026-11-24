import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

const TOAST_DURATION_MS = 4500;
const DEFAULT_ERROR_MESSAGE = 'Une erreur inattendue est survenue';

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

  /** Accepts a message or an HTTP error (uses the backend's message when there is one). */
  error(errorOrMessage: unknown): void {
    this.show('error', toErrorMessage(errorOrMessage));
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(kind: Toast['kind'], message: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (typeof body === 'string' && body) return body;
    return body?.detail ?? body?.message ?? DEFAULT_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
}
