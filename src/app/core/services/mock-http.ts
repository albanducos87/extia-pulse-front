import { Observable, defer, delay, of, throwError } from 'rxjs';

const LATENCY_MS = 250;

/**
 * Simulates an HTTP round-trip. Services return Observables so that swapping
 * these mocks for HttpClient calls later doesn't change any component code.
 */
export function mockResponse<T>(factory: () => T): Observable<T> {
  return defer(() => {
    try {
      return of(structuredClone(factory()));
    } catch (err) {
      return throwError(() => err);
    }
  }).pipe(delay(LATENCY_MS));
}

export class ApiError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('\n'));
  }
}
