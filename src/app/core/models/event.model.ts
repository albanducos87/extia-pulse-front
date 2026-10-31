export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type Visibility = 'PRIVATE' | 'POLE' | 'COMPANY';

/** Mirrors the backend EventDto (dates are ISO LocalDateTime strings). */
export interface PulseEvent {
  id: number;
  title: string;
  description: string | null;
  eventTypeId: number;
  eventTypeCode: string;
  eventTypeLabel: string;
  poleId: number;
  poleName: string;
  creatorId: number;
  creatorFirstName: string;
  creatorLastName: string;
  startAt: string;
  endAt: string | null;
  timezone: string | null;
  locationName: string | null;
  address: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  rsvpDeadline: string;
  visibility: Visibility;
  status: EventStatus;
}

/** Mirrors the query params of GET /api/events, plus client-side search. */
export interface EventFilter {
  poleId?: number | null;
  creatorId?: number | null;
  eventTypeId?: number | null;
  startFrom?: string | null;
  startTo?: string | null;
  visibility?: Visibility | null;
  status?: EventStatus | null;
  search?: string | null;
}

/** Mirrors CreateEventRequestDto / UpdateEventRequestDto. */
export interface EventRequest {
  title: string;
  description: string | null;
  eventTypeId: number;
  poleId: number;
  startDate: string;
  endDate: string | null;
  timeZone: string | null;
  locationName: string | null;
  address: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  rsvpDeadline: string;
  visibility: Visibility;
  status: EventStatus;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CANCELLED: 'Annulé',
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: 'Privé',
  POLE: 'Pôle',
  COMPANY: 'Entreprise',
};
