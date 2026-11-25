import { NotFoundDomainError } from "@shared/errors";

import { Attendance } from "../domain/attendance.entity";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { LiveSessionNotJoinableError } from "../domain/live-session-join-window";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { buildLiveSession } from "./live-session-test-helpers";
import { RecordAttendanceUseCase } from "./record-attendance.use-case";

function att(overrides: Partial<Parameters<typeof Attendance.fromPersistence>[0]> = {}) {
  return Attendance.fromPersistence({
    id: "a1",
    liveSessionId: "s1",
    userId: "u1",
    joinedAt: null,
    leftAt: null,
    attended: false,
    ...overrides,
  });
}

describe("RecordAttendanceUseCase", () => {
  function build(session: ReturnType<typeof buildLiveSession> | null, existing: Attendance | null) {
    const sessions = { findById: jest.fn().mockResolvedValue(session) } as unknown as LiveSessionRepositoryPort;
    const registered = att();
    const attendances = {
      findByLiveSessionAndUser: jest.fn().mockResolvedValue(existing),
      register: jest.fn().mockResolvedValue(registered),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendanceRepositoryPort;
    return { useCase: new RecordAttendanceUseCase(sessions, attendances), attendances, registered };
  }

  const now = new Date("2026-03-15T10:05:00Z");

  describe("recordJoin", () => {
    it("lève NotFound si la session n'existe pas", async () => {
      const { useCase } = build(null, null);
      await expect(useCase.recordJoin("s1", "u1", now)).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("refuse de rejoindre hors de la fenêtre", async () => {
      const { useCase, attendances } = build(buildLiveSession(), null);
      await expect(useCase.recordJoin("s1", "u1", new Date("2026-03-15T08:00:00Z"))).rejects.toBeInstanceOf(
        LiveSessionNotJoinableError,
      );
      expect(attendances.save).not.toHaveBeenCalled();
    });

    it("inscrit puis enregistre la connexion quand aucune présence n'existe", async () => {
      const { useCase, attendances, registered } = build(buildLiveSession(), null);
      await useCase.recordJoin("s1", "u1", now);
      expect(attendances.register).toHaveBeenCalledWith("s1", "u1");
      expect(registered.toSnapshot().joinedAt).toBeInstanceOf(Date);
      expect(attendances.save).toHaveBeenCalledWith(registered);
    });

    it("réutilise la présence existante sans la réinscrire", async () => {
      const existing = att();
      const { useCase, attendances } = build(buildLiveSession(), existing);
      await useCase.recordJoin("s1", "u1", now);
      expect(attendances.register).not.toHaveBeenCalled();
      expect(attendances.save).toHaveBeenCalledWith(existing);
    });
  });

  describe("recordLeave", () => {
    it("lève NotFound si la session n'existe pas", async () => {
      const { useCase } = build(null, null);
      await expect(useCase.recordLeave("s1", "u1")).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it("marque présent si la durée de connexion atteint 70 % de la session", async () => {
      const existing = att({ joinedAt: new Date(Date.now() - 50 * 60_000) });
      const { useCase, attendances } = build(buildLiveSession({ durationMinutes: 60 }), existing);
      await useCase.recordLeave("s1", "u1");
      expect(existing.attended).toBe(true);
      expect(attendances.save).toHaveBeenCalledWith(existing);
    });

    it("marque absent si la connexion est trop courte", async () => {
      const existing = att({ joinedAt: new Date(Date.now() - 5 * 60_000) });
      const { useCase } = build(buildLiveSession({ durationMinutes: 60 }), existing);
      await useCase.recordLeave("s1", "u1");
      expect(existing.attended).toBe(false);
    });

    it("inscrit l'apprenant s'il n'avait pas de présence (absent car jamais connecté)", async () => {
      const { useCase, attendances, registered } = build(buildLiveSession(), null);
      await useCase.recordLeave("s1", "u1");
      expect(attendances.register).toHaveBeenCalledWith("s1", "u1");
      expect(registered.attended).toBe(false);
      expect(attendances.save).toHaveBeenCalledWith(registered);
    });
  });
});
