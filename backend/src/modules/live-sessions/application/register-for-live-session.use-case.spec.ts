import { NotFoundDomainError } from "@shared/errors";

import { Attendance } from "../domain/attendance.entity";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { SessionFullError } from "../domain/live-session.entity";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { buildLiveSession } from "./live-session-test-helpers";
import { RegisterForLiveSessionUseCase } from "./register-for-live-session.use-case";

const attendance = Attendance.fromPersistence({
  id: "a1",
  liveSessionId: "s1",
  userId: "u1",
  joinedAt: null,
  leftAt: null,
  attended: false,
});

describe("RegisterForLiveSessionUseCase", () => {
  function build(session: ReturnType<typeof buildLiveSession> | null, existing: Attendance | null, count = 0) {
    const sessions = {
      findById: jest.fn().mockResolvedValue(session),
      countRegistrations: jest.fn().mockResolvedValue(count),
    } as unknown as LiveSessionRepositoryPort;
    const attendances = {
      findByLiveSessionAndUser: jest.fn().mockResolvedValue(existing),
      register: jest.fn().mockResolvedValue(attendance),
    } as unknown as AttendanceRepositoryPort;
    return { useCase: new RegisterForLiveSessionUseCase(sessions, attendances), sessions, attendances };
  }

  it("lève NotFound si la session est introuvable", async () => {
    const { useCase } = build(null, null);
    await expect(useCase.execute("s1", "u1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("est idempotent : renvoie la présence existante sans compter ni inscrire", async () => {
    const { useCase, sessions, attendances } = build(buildLiveSession({ capacity: 1 }), attendance, 5);
    await expect(useCase.execute("s1", "u1")).resolves.toBe(attendance);
    expect(sessions.countRegistrations).not.toHaveBeenCalled();
    expect(attendances.register).not.toHaveBeenCalled();
  });

  it("refuse l'inscription quand la capacité est atteinte", async () => {
    const { useCase, attendances } = build(buildLiveSession({ capacity: 2 }), null, 2);
    await expect(useCase.execute("s1", "u1")).rejects.toBeInstanceOf(SessionFullError);
    expect(attendances.register).not.toHaveBeenCalled();
  });

  it("inscrit l'apprenant s'il reste une place", async () => {
    const { useCase, attendances } = build(buildLiveSession({ capacity: 2 }), null, 1);
    await expect(useCase.execute("s1", "u1")).resolves.toBe(attendance);
    expect(attendances.register).toHaveBeenCalledWith("s1", "u1");
  });
});
