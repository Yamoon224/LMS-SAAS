import { LiveSessionStatus } from "../domain/live-session-status";
import { LiveSession, type LiveSessionProps } from "../domain/live-session.entity";

export function buildLiveSession(overrides: Partial<LiveSessionProps> = {}): LiveSession {
  return LiveSession.fromPersistence({
    id: "s1",
    tenantId: "t1",
    courseId: "c1",
    moduleId: "m1",
    title: "Webinaire",
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
  });
}
