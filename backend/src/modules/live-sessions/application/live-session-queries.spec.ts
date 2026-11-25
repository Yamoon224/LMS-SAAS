import { NotFoundDomainError } from "@shared/errors";

import { Attendance } from "../domain/attendance.entity";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import { LiveSessionStatus } from "../domain/live-session-status";
import { SessionAlreadyPassedError } from "../domain/live-session.entity";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import type { VideoConferenceProviderPort } from "../domain/video-conference-provider.port";

import { CancelLiveSessionUseCase } from "./cancel-live-session.use-case";
import { IsLiveAttendanceSatisfiedUseCase } from "./is-live-attendance-satisfied.use-case";
import { ListLiveSessionsUseCase } from "./list-live-sessions.use-case";
import { buildLiveSession } from "./live-session-test-helpers";
import { SetReplayUrlUseCase } from "./set-replay-url.use-case";

describe("ListLiveSessionsUseCase", () => {
  it("délègue au dépôt pour cours, modules et prochaines sessions", async () => {
    const s = [buildLiveSession()];
    const repo = {
      listByCourse: jest.fn().mockResolvedValue(s),
      listByModule: jest.fn().mockResolvedValue(s),
      listUpcomingByCourses: jest.fn().mockResolvedValue(s),
    } as unknown as LiveSessionRepositoryPort;
    const useCase = new ListLiveSessionsUseCase(repo);
    const from = new Date();

    await expect(useCase.listForCourse("c1")).resolves.toBe(s);
    await expect(useCase.listForModule("m1")).resolves.toBe(s);
    await expect(useCase.listUpcomingForCourses(["c1"], from, 3)).resolves.toBe(s);
    expect(repo.listByCourse).toHaveBeenCalledWith("c1");
    expect(repo.listByModule).toHaveBeenCalledWith("m1");
    expect(repo.listUpcomingByCourses).toHaveBeenCalledWith(["c1"], from, 3);
  });
});

describe("SetReplayUrlUseCase", () => {
  it("enregistre le replay sur la session du tenant", async () => {
    const session = buildLiveSession();
    const repo = { findById: jest.fn().mockResolvedValue(session), save: jest.fn() } as unknown as LiveSessionRepositoryPort;
    await new SetReplayUrlUseCase(repo).execute("s1", "t1", "https://replay");
    expect(session.replayUrl).toBe("https://replay");
    expect(repo.save).toHaveBeenCalledWith(session);
  });

  it("lève NotFound si absente ou d'un autre tenant", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(buildLiveSession()), save: jest.fn() } as unknown as LiveSessionRepositoryPort;
    await expect(new SetReplayUrlUseCase(repo).execute("s1", "other", "u")).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("CancelLiveSessionUseCase", () => {
  function build(session: ReturnType<typeof buildLiveSession> | null) {
    const repo = { findById: jest.fn().mockResolvedValue(session), save: jest.fn() } as unknown as LiveSessionRepositoryPort;
    const provider = { cancelEvent: jest.fn() } as unknown as VideoConferenceProviderPort;
    return { useCase: new CancelLiveSessionUseCase(repo, provider), repo, provider };
  }

  it("annule la session et l'événement Google associé", async () => {
    const session = buildLiveSession({ googleEventId: "g1" });
    const { useCase, repo, provider } = build(session);
    await useCase.execute("s1", "t1");
    expect(session.status).toBe(LiveSessionStatus.CANCELED);
    expect(repo.save).toHaveBeenCalledWith(session);
    expect(provider.cancelEvent).toHaveBeenCalledWith("g1");
  });

  it("n'appelle pas Google sans événement associé", async () => {
    const { useCase, provider } = build(buildLiveSession());
    await useCase.execute("s1", "t1");
    expect(provider.cancelEvent).not.toHaveBeenCalled();
  });

  it("lève NotFound pour une session absente", async () => {
    const { useCase } = build(null);
    await expect(useCase.execute("s1", "t1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("refuse d'annuler une session déjà passée", async () => {
    const { useCase, repo } = build(buildLiveSession({ status: LiveSessionStatus.COMPLETED }));
    await expect(useCase.execute("s1", "t1")).rejects.toBeInstanceOf(SessionAlreadyPassedError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("IsLiveAttendanceSatisfiedUseCase", () => {
  const att = (liveSessionId: string, attended: boolean) =>
    Attendance.fromPersistence({ id: liveSessionId, liveSessionId, userId: "u1", joinedAt: null, leftAt: null, attended });

  function build(sessions: string[], attendances: Attendance[]) {
    const repo = {
      listByModule: jest.fn().mockResolvedValue(sessions.map((id) => buildLiveSession({ id }))),
    } as unknown as LiveSessionRepositoryPort;
    const attRepo = {
      listAttendedByUserAndModule: jest.fn().mockResolvedValue(attendances),
    } as unknown as AttendanceRepositoryPort;
    return { useCase: new IsLiveAttendanceSatisfiedUseCase(repo, attRepo), attRepo };
  }

  it("est satisfaite sans session live", async () => {
    const { useCase, attRepo } = build([], []);
    await expect(useCase.execute("u1", "m1")).resolves.toBe(true);
    expect(attRepo.listAttendedByUserAndModule).not.toHaveBeenCalled();
  });

  it("exige une présence effective sur chaque session", async () => {
    const { useCase } = build(["a", "b"], [att("a", true), att("b", true)]);
    await expect(useCase.execute("u1", "m1")).resolves.toBe(true);
  });

  it("n'est pas satisfaite si une présence manque ou n'est pas effective", async () => {
    await expect(build(["a", "b"], [att("a", true)]).useCase.execute("u1", "m1")).resolves.toBe(false);
    await expect(build(["a"], [att("a", false)]).useCase.execute("u1", "m1")).resolves.toBe(false);
  });
});
