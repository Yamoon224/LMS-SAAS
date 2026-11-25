export interface CreateConferenceEventRequest {
  title: string;
  startAt: Date;
  durationMinutes: number;
  timezone: string;
  attendeeEmails: string[];
}

export interface ConferenceEvent {
  providerEventId: string;
  meetLink: string;
}

/**
 * Port vers le fournisseur de visioconférence (section 12.6, Google Meet via
 * Google Calendar API). Séparé de la persistance LiveSession : ce port ne
 * fait que créer/annuler l'événement côté fournisseur, sans connaître le
 * modèle de données interne.
 */
export interface VideoConferenceProviderPort {
  createEvent(request: CreateConferenceEventRequest): Promise<ConferenceEvent>;
  cancelEvent(providerEventId: string): Promise<void>;
  /** ENT-55: ajoute des inscrits tardifs comme invités à un événement déjà créé. */
  addAttendees(providerEventId: string, attendeeEmails: string[]): Promise<void>;
}

export const VIDEO_CONFERENCE_PROVIDER = Symbol("VIDEO_CONFERENCE_PROVIDER");
