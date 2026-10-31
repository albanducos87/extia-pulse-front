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
  { id: 1, name: 'Paris' },
  { id: 2, name: 'Lyon' },
  { id: 3, name: 'Montréal' },
  { id: 4, name: 'Toulouse' },
];

export const MOCK_EVENT_TYPES: EventType[] = [
  { id: 1, code: 'AFTERWORK', label: 'Afterwork' },
  { id: 2, code: 'TRAINING', label: 'Formation' },
  { id: 3, code: 'MEETUP', label: 'Meetup technique' },
  { id: 4, code: 'SPORT', label: 'Sport' },
  { id: 5, code: 'SEMINAR', label: 'Séminaire' },
];

export const MOCK_USERS: AppUser[] = [
  { id: 1, poleId: 1, email: 'alban.ducos@extia.fr', firstName: 'Alban', lastName: 'Ducos', role: 'ADMIN', active: true },
  { id: 2, poleId: 1, email: 'claire.martin@extia.fr', firstName: 'Claire', lastName: 'Martin', role: 'MANAGER', active: true },
  { id: 3, poleId: 2, email: 'hugo.bernard@extia.fr', firstName: 'Hugo', lastName: 'Bernard', role: 'EMPLOYEE', active: true },
  { id: 4, poleId: 3, email: 'lea.tremblay@extia.fr', firstName: 'Léa', lastName: 'Tremblay', role: 'MANAGER', active: true },
  { id: 5, poleId: 2, email: 'nina.petit@extia.fr', firstName: 'Nina', lastName: 'Petit', role: 'EMPLOYEE', active: false },
  { id: 6, poleId: 4, email: 'samir.haddad@extia.fr', firstName: 'Samir', lastName: 'Haddad', role: 'EMPLOYEE', active: true },
  { id: 7, poleId: 3, email: 'marc.gagnon@extia.fr', firstName: 'Marc', lastName: 'Gagnon', role: 'EMPLOYEE', active: true },
];

type SeedEvent = Omit<
  PulseEvent,
  'eventTypeCode' | 'eventTypeLabel' | 'poleName' | 'creatorFirstName' | 'creatorLastName'
>;

const SEED_EVENTS: SeedEvent[] = [
  {
    id: 1, title: 'Afterwork de rentrée', eventTypeId: 1, poleId: 1, creatorId: 2,
    description: 'Retrouvons-nous autour d’un verre pour fêter la rentrée. Boissons et planches offertes !',
    startAt: daysFromNow(3, 18, 30), endAt: daysFromNow(3, 22), timezone: 'Europe/Paris',
    locationName: 'Le Comptoir', address: '12 rue de la Paix, 75002 Paris', onlineUrl: null,
    capacity: 40, rsvpDeadline: daysFromNow(2, 12), visibility: 'POLE', status: 'PUBLISHED',
  },
  {
    id: 2, title: 'Formation Angular avancé', eventTypeId: 2, poleId: 1, creatorId: 1,
    description: 'Signals, zoneless et nouvelles API de formulaires : une journée pour monter en compétence.',
    startAt: daysFromNow(8, 9), endAt: daysFromNow(8, 17), timezone: 'Europe/Paris',
    locationName: 'Salle Eiffel', address: '35 avenue de l’Opéra, 75002 Paris',
    onlineUrl: 'https://meet.example.com/angular', capacity: 15, rsvpDeadline: daysFromNow(5, 18),
    visibility: 'COMPANY', status: 'PUBLISHED',
  },
  {
    id: 3, title: 'Meetup Cloud AWS', eventTypeId: 3, poleId: 3, creatorId: 4,
    description: 'Retours d’expérience sur Cognito, Lambda et l’architecture serverless.',
    startAt: daysFromNow(12, 17), endAt: daysFromNow(12, 19, 30), timezone: 'America/Toronto',
    locationName: 'Espace Extia Montréal', address: '1000 rue Sherbrooke O, Montréal', onlineUrl: null,
    capacity: 60, rsvpDeadline: daysFromNow(10, 12), visibility: 'COMPANY', status: 'PUBLISHED',
  },
  {
    id: 4, title: 'Tournoi de padel', eventTypeId: 4, poleId: 2, creatorId: 3,
    description: 'Tournoi amical en double, tous niveaux bienvenus.',
    startAt: daysFromNow(15, 12), endAt: daysFromNow(15, 14), timezone: 'Europe/Paris',
    locationName: 'Padel Club Lyon', address: '8 quai Perrache, 69002 Lyon', onlineUrl: null,
    capacity: 16, rsvpDeadline: daysFromNow(13, 18), visibility: 'POLE', status: 'DRAFT',
  },
  {
    id: 5, title: 'Séminaire annuel', eventTypeId: 5, poleId: 1, creatorId: 1,
    description: 'Bilan de l’année, stratégie et soirée de gala.',
    startAt: daysFromNow(30, 9), endAt: daysFromNow(31, 18), timezone: 'Europe/Paris',
    locationName: 'Château de Vincennes', address: 'Avenue de Paris, 94300 Vincennes', onlineUrl: null,
    capacity: 200, rsvpDeadline: daysFromNow(20, 18), visibility: 'COMPANY', status: 'PUBLISHED',
  },
  {
    id: 6, title: 'Atelier Spring Boot', eventTypeId: 2, poleId: 4, creatorId: 6,
    description: 'Architecture hexagonale avec Spring Boot 3, en distanciel.',
    startAt: daysFromNow(6, 14), endAt: daysFromNow(6, 16), timezone: 'Europe/Paris',
    locationName: null, address: null, onlineUrl: 'https://meet.example.com/spring',
    capacity: 25, rsvpDeadline: daysFromNow(5, 12), visibility: 'COMPANY', status: 'CANCELLED',
  },
  {
    id: 7, title: 'Afterwork d’été', eventTypeId: 1, poleId: 2, creatorId: 3,
    description: 'Pique-nique au parc de la Tête d’Or.',
    startAt: daysFromNow(-20, 18), endAt: daysFromNow(-20, 21), timezone: 'Europe/Paris',
    locationName: 'Parc de la Tête d’Or', address: '69006 Lyon', onlineUrl: null,
    capacity: 50, rsvpDeadline: daysFromNow(-22, 12), visibility: 'POLE', status: 'PUBLISHED',
  },
  {
    id: 8, title: 'Préparation séminaire', eventTypeId: 5, poleId: 1, creatorId: 1,
    description: 'Réunion interne de préparation (organisateurs uniquement).',
    startAt: daysFromNow(4, 10), endAt: daysFromNow(4, 11), timezone: 'Europe/Paris',
    locationName: 'Salle Montmartre', address: '35 avenue de l’Opéra, 75002 Paris', onlineUrl: null,
    capacity: 6, rsvpDeadline: daysFromNow(3, 18), visibility: 'PRIVATE', status: 'DRAFT',
  },
];

export const MOCK_EVENTS: PulseEvent[] = SEED_EVENTS.map((e) => enrichEvent(e));

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
