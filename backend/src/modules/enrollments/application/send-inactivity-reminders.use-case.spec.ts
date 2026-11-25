import type { EventEmitter2 } from "@nestjs/event-emitter";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import type { InactivityCandidate } from "../domain/inactivity-reminder";

import { SendInactivityRemindersUseCase } from "./send-inactivity-reminders.use-case";

const now = new Date("2026-11-18T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

const candidate = (overrides: Partial<InactivityCandidate> = {}): InactivityCandidate => ({
  enrollmentId: "e1",
  userId: "u1",
  courseId: "c1",
  status: EnrollmentStatus.ACTIVE,
  expiresAt: null,
  lastActivityAt: daysAgo(10),
  lastReminderAt: null,
  ...overrides,
});

function build(candidates: InactivityCandidate[], claim = true) {
  const repository = {
    listInactivityCandidates: jest.fn().mockResolvedValue(candidates),
    claimInactivityReminder: jest.fn().mockResolvedValue(claim),
  } as unknown as EnrollmentRepositoryPort;
  const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
  return { repository, emitter, useCase: new SendInactivityRemindersUseCase(repository, emitter) };
}

describe("SendInactivityRemindersUseCase", () => {
  it("émet un événement par inscription inactive après avoir réservé le rappel", async () => {
    const { repository, emitter, useCase } = build([candidate()]);
    await expect(useCase.execute(now)).resolves.toBe(1);
    expect(repository.claimInactivityReminder).toHaveBeenCalledWith("e1", now, null);
    expect(emitter.emit).toHaveBeenCalledWith(
      "enrollment.inactivity-detected",
      expect.objectContaining({ enrollmentId: "e1", userId: "u1", courseId: "c1", daysInactive: 10 }),
    );
  });

  it("n'émet rien si le rappel a déjà été réservé par un autre passage (pas de doublon)", async () => {
    const { emitter, useCase } = build([candidate()], false);
    await expect(useCase.execute(now)).resolves.toBe(0);
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("n'émet rien pour une inscription terminée, suspendue ou déjà relancée récemment", async () => {
    const { repository, emitter, useCase } = build([
      candidate({ enrollmentId: "a", status: EnrollmentStatus.COMPLETED }),
      candidate({ enrollmentId: "b", status: EnrollmentStatus.SUSPENDED }),
      candidate({ enrollmentId: "c", lastReminderAt: daysAgo(3) }),
    ]);
    await expect(useCase.execute(now)).resolves.toBe(0);
    expect(repository.claimInactivityReminder).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("deux passages successifs n'envoient qu'un seul rappel", async () => {
    const reminded: Record<string, Date> = {};
    const repository = {
      listInactivityCandidates: jest.fn().mockImplementation(async () => [
        candidate({ lastReminderAt: reminded.e1 ?? null }),
      ]),
      claimInactivityReminder: jest.fn().mockImplementation(async (id: string, at: Date) => {
        reminded[id] = at;
        return true;
      }),
    } as unknown as EnrollmentRepositoryPort;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const useCase = new SendInactivityRemindersUseCase(repository, emitter);

    await useCase.execute(now);
    await useCase.execute(new Date(now.getTime() + 3_600_000));
    expect(emitter.emit).toHaveBeenCalledTimes(1);
  });
});
