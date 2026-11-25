import { InvalidStateTransitionError } from "@shared/errors";

import { LiveSessionStatus } from "./live-session-status";
import { LiveSession, SessionAlreadyPassedError, type LiveSessionProps } from "./live-session.entity";

function buildSession(overrides: Partial<LiveSessionProps> = {}): LiveSession {
  const props: LiveSessionProps = {
    id: "session-1",
    tenantId: "tenant-1",
    courseId: "course-1",
    moduleId: null,
    title: "Webinaire d'introduction",
    startAt: new Date("2026-03-15T10:00:00Z"),
    durationMinutes: 60,
    timezone: "Africa/Abidjan",
    status: LiveSessionStatus.SCHEDULED,
    meetLink: null,
    googleEventId: null,
    capacity: null,
    replayUrl: null,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    ...overrides,
  };
  return LiveSession.fromPersistence(props);
}

describe("LiveSession", () => {
  describe("hasAvailableSeat (ENT-52)", () => {
    it("retourne toujours true si la capacité est illimitée", () => {
      const session = buildSession({ capacity: null });
      expect(session.hasAvailableSeat(1000)).toBe(true);
    });

    it("retourne true si les inscriptions actuelles sont sous la capacité", () => {
      const session = buildSession({ capacity: 50 });
      expect(session.hasAvailableSeat(49)).toBe(true);
    });

    it("retourne false une fois la capacité atteinte", () => {
      const session = buildSession({ capacity: 50 });
      expect(session.hasAvailableSeat(50)).toBe(false);
    });
  });

  describe("transitions", () => {
    it("suit SCHEDULED -> IN_PROGRESS -> COMPLETED", () => {
      const session = buildSession({ status: LiveSessionStatus.SCHEDULED });
      session.start();
      expect(session.status).toBe(LiveSessionStatus.IN_PROGRESS);
      session.complete();
      expect(session.status).toBe(LiveSessionStatus.COMPLETED);
    });

    it("rejette la complétion directe depuis SCHEDULED", () => {
      const session = buildSession({ status: LiveSessionStatus.SCHEDULED });
      expect(() => session.complete()).toThrow(InvalidStateTransitionError);
    });
  });

  describe("cancel (ENT-56)", () => {
    it("annule une session planifiée", () => {
      const session = buildSession({ status: LiveSessionStatus.SCHEDULED });
      session.cancel();
      expect(session.status).toBe(LiveSessionStatus.CANCELED);
    });

    it("rejette l'annulation d'une session déjà en cours", () => {
      const session = buildSession({ status: LiveSessionStatus.IN_PROGRESS });
      expect(() => session.cancel()).toThrow(SessionAlreadyPassedError);
    });

    it("rejette l'annulation d'une session déjà terminée", () => {
      const session = buildSession({ status: LiveSessionStatus.COMPLETED });
      expect(() => session.cancel()).toThrow(SessionAlreadyPassedError);
    });
  });

  describe("attachGoogleMeet", () => {
    it("fixe le lien Meet et l'identifiant d'événement Google", () => {
      const session = buildSession();
      session.attachGoogleMeet("https://meet.google.com/abc-defg-hij", "google-event-1");
      expect(session.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    });
  });
});

describe("LiveSession accessors", () => {
  it("expose les propriétés persistées", () => {
    const session = buildSession({ moduleId: "m1", capacity: 10, replayUrl: "https://r", meetLink: "https://meet" });
    expect(session.id).toBe("session-1");
    expect(session.tenantId).toBe("tenant-1");
    expect(session.courseId).toBe("course-1");
    expect(session.moduleId).toBe("m1");
    expect(session.title).toBe("Webinaire d'introduction");
    expect(session.startAt).toEqual(new Date("2026-03-15T10:00:00Z"));
    expect(session.durationMinutes).toBe(60);
    expect(session.timezone).toBe("Africa/Abidjan");
    expect(session.capacity).toBe(10);
    expect(session.replayUrl).toBe("https://r");
    expect(session.meetLink).toBe("https://meet");
  });
});
