import { PulseEvent } from '../models/event.model';
import { EventType } from '../models/event-type.model';
import { Pole } from '../models/pole.model';
import { AppUser } from '../models/user.model';

/** Returns a LocalDateTime string (YYYY-MM-DDTHH:mm:ss) offset from today. */
function daysFromNow(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return toLocalDateTime(d);
}

export function toLocalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

export const MOCK_POLES: Pole[] = [
  { id: 1, company: 1, name: 'Paris' },
  { id: 2, company: 1, name: 'Lyon' },
  { id: 3, company: 1, name: 'Montréal' },
  { id: 4, company: 1, name: 'Toulouse' },
];

export const montreal: Pole = {
  id: 3,
  company: 1,
  name: 'Montreal'
}

export const MOCK_EVENT_TYPES: EventType[] = [
  { id: 1, code: 'AFTERWORK', label: 'Afterwork' },
  { id: 2, code: 'TRAINING', label: 'Formation' },
  { id: 3, code: 'MEETUP', label: 'Meetup technique' },
  { id: 4, code: 'SPORT', label: 'Sport' },
  { id: 5, code: 'SEMINAR', label: 'Séminaire' },
];

export const MOCK_USERS: AppUser[] = [
  { id: 1, pole: montreal, email: 'alban.ducos@extia.fr', firstName: 'Alban', lastName: 'Ducos', role: 'ADMIN', active: true },
  { id: 2, pole: montreal, email: 'claire.martin@extia.fr', firstName: 'Claire', lastName: 'Martin', role: 'MANAGER', active: true },
  { id: 3, pole: montreal, email: 'hugo.bernard@extia.fr', firstName: 'Hugo', lastName: 'Bernard', role: 'EMPLOYEE', active: true },
  { id: 4, pole: montreal, email: 'lea.tremblay@extia.fr', firstName: 'Léa', lastName: 'Tremblay', role: 'MANAGER', active: true },
  { id: 5, pole: montreal, email: 'nina.petit@extia.fr', firstName: 'Nina', lastName: 'Petit', role: 'EMPLOYEE', active: false },
  { id: 6, pole: montreal, email: 'samir.haddad@extia.fr', firstName: 'Samir', lastName: 'Haddad', role: 'EMPLOYEE', active: true },
  { id: 7, pole: montreal, email: 'marc.gagnon@extia.fr', firstName: 'Marc', lastName: 'Gagnon', role: 'EMPLOYEE', active: true },
];

type SeedEvent = Omit<
  PulseEvent,
  'eventTypeCode' | 'eventTypeLabel' | 'poleName' | 'creatorFirstName' | 'creatorLastName'
>;



/** Fills denormalized fields the backend would return (type label, pole name, creator name). */
export function enrichEvent(e: SeedEvent): PulseEvent {
  const type = MOCK_EVENT_TYPES.find((t) => t.id === e.eventTypeId);
  const pole = MOCK_POLES.find((p) => p.id === e.poleId);
  const creator = MOCK_USERS.find((u) => u.id === e.creatorId);
  return {
    ...e,
    eventTypeCode: type?.code ?? '',
    eventTypeLabel: type?.label ?? '',
    poleName: pole?.name ?? '',
    creatorFirstName: creator?.firstName ?? '',
    creatorLastName: creator?.lastName ?? '',
  };
}

/** Initial participant counts per event (no RSVP endpoint in the backend yet). */
export const MOCK_PARTICIPANT_COUNTS: Record<number, number> = {
  1: 23,
  2: 14,
  3: 31,
  5: 87,
  7: 18,
};
