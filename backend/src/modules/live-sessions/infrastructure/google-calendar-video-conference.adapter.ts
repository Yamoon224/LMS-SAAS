import { IntegrationsFacade } from "@modules/integrations/integrations.facade";
import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { nanoid } from "nanoid";

import type {
  ConferenceEvent,
  CreateConferenceEventRequest,
  VideoConferenceProviderPort,
} from "../domain/video-conference-provider.port";

/**
 * Adaptateur Google Calendar API (section 12.6) : crée un événement avec
 * visioconférence Google Meet (conferenceData) via un compte de service
 * unique de la plateforme — aucune connexion Google par tenant n'est
 * requise, cohérent avec le reste de l'intégration (section 4.1, module
 * Live Sessions).
 */
@Injectable()
export class GoogleCalendarVideoConferenceAdapter implements VideoConferenceProviderPort {
  private readonly logger = new Logger(GoogleCalendarVideoConferenceAdapter.name);

  constructor(private readonly integrations: IntegrationsFacade) {}

  async createEvent(request: CreateConferenceEventRequest): Promise<ConferenceEvent> {
    const { calendar, calendarId } = await this.getCalendarClient();
    const endAt = new Date(request.startAt);
    endAt.setMinutes(endAt.getMinutes() + request.durationMinutes);

    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: request.title,
        start: { dateTime: request.startAt.toISOString(), timeZone: request.timezone },
        end: { dateTime: endAt.toISOString(), timeZone: request.timezone },
        attendees: request.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: nanoid(16),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const providerEventId = response.data.id;
    const meetLink = response.data.hangoutLink;
    if (!providerEventId || !meetLink) {
      throw new Error("Google Calendar n'a pas renvoyé de lien Google Meet.");
    }

    return { providerEventId, meetLink };
  }

  async cancelEvent(providerEventId: string): Promise<void> {
    const { calendar, calendarId } = await this.getCalendarClient();
    try {
      await calendar.events.delete({ calendarId, eventId: providerEventId });
    } catch (error) {
      this.logger.error(`Échec de la suppression de l'événement Google Calendar ${providerEventId}`, error);
    }
  }

  async addAttendees(providerEventId: string, attendeeEmails: string[]): Promise<void> {
    const { calendar, calendarId } = await this.getCalendarClient();
    const event = await calendar.events.get({ calendarId, eventId: providerEventId });
    const existingAttendees = event.data.attendees ?? [];

    await calendar.events.patch({
      calendarId,
      eventId: providerEventId,
      requestBody: {
        attendees: [...existingAttendees, ...attendeeEmails.map((email) => ({ email }))],
      },
    });
  }

  /** Configuration relue à chaque appel (ADM-37) : Admin > environnement. */
  private async getCalendarClient() {
    const config = await this.integrations.resolve("GOOGLE_CALENDAR");
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: (config.privateKey ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return { calendar: google.calendar({ version: "v3", auth }), calendarId: config.calendarId ?? "primary" };
  }
}
