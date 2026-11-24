import { PulseEvent } from '../models/event.model';

/** An event is over once its end date (or its start date when it has none) is behind us. */
export function isEventPast(event: PulseEvent, now = new Date()): boolean {
  return new Date(event.endAt ?? event.startAt) < now;
}

/** Registrations are closed once the RSVP deadline is behind us. */
export function isRsvpClosed(event: PulseEvent, now = new Date()): boolean {
  return new Date(event.rsvpDeadline) < now;
}

/** Every seat is taken (an event without capacity is never full). */
export function isEventFull(event: PulseEvent): boolean {
  return event.capacity != null && (event.participants?.length ?? 0) >= event.capacity;
}

export function byStartDate(a: PulseEvent, b: PulseEvent): number {
  return a.startAt.localeCompare(b.startAt);
}
