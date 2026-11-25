import { LiveSessionStatus } from "../domain/live-session-status";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { buildLiveSession } from "./live-session-test-helpers";
import { TransitionLiveSessionStatusesUseCase } from "./transition-live-session-statuses.use-case";

describe("TransitionLiveSessionStatusesUseCase", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  function build(toStart: ReturnType<typeof buildLiveSession>[], toComplete: ReturnType<typeof buildLiveSession>[]) {
    const repo = {
      listScheduledStartingBefore: jest.fn().mockResolvedValue(toStart),
      listInProgressEndingBefore: jest.fn().mockResolvedValue(toComplete),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as LiveSessionRepositoryPort;
    return { useCase: new TransitionLiveSessionStatusesUseCase(repo), repo };
  }

  it("démarre les sessions planifiées dont l'heure est passée et termine celles en cours échues", async () => {
    const a = buildLiveSession({ id: "a" });
    const b = buildLiveSession({ id: "b", status: LiveSessionStatus.IN_PROGRESS });
    const { useCase, repo } = build([a], [b]);

    await useCase.execute(now);

    expect(repo.listScheduledStartingBefore).toHaveBeenCalledWith(now);
    expect(repo.listInProgressEndingBefore).toHaveBeenCalledWith(now);
    expect(a.status).toBe(LiveSessionStatus.IN_PROGRESS);
    expect(b.status).toBe(LiveSessionStatus.COMPLETED);
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save).toHaveBeenCalledWith(a);
    expect(repo.save).toHaveBeenCalledWith(b);
  });

  it("ne sauvegarde rien quand aucune session n'est à faire avancer", async () => {
    const { useCase, repo } = build([], []);
    await useCase.execute();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
