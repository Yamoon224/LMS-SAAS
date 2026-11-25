import { NotFoundDomainError } from "@shared/errors";

import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import type { VideoConferenceProviderPort } from "../domain/video-conference-provider.port";

import { CancelLiveSessionUseCase } from "./cancel-live-session.use-case";
import { SetReplayUrlUseCase } from "./set-replay-url.use-case";

function repositoryFor(session: unknown): LiveSessionRepositoryPort {
  return { findById: jest.fn().mockResolvedValue(session), save: jest.fn() } as unknown as LiveSessionRepositoryPort;
}

const provider = { cancelEvent: jest.fn() } as unknown as VideoConferenceProviderPort;

describe("Live session tenant ownership", () => {
  it("cancels a session of the tenant", async () => {
    const session = { tenantId: "tenant-1", cancel: jest.fn(), toSnapshot: () => ({ googleEventId: null }) };
    const repository = repositoryFor(session);
    await new CancelLiveSessionUseCase(repository, provider).execute("ls-1", "tenant-1");
    expect(session.cancel).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it("raises NotFound and does not cancel a session of another tenant", async () => {
    const session = { tenantId: "tenant-B", cancel: jest.fn(), toSnapshot: () => ({ googleEventId: "g" }) };
    const repository = repositoryFor(session);
    await expect(new CancelLiveSessionUseCase(repository, provider).execute("ls-1", "tenant-A")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(session.cancel).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("does not set the replay URL of a session of another tenant", async () => {
    const session = { tenantId: "tenant-B", setReplayUrl: jest.fn() };
    const repository = repositoryFor(session);
    await expect(
      new SetReplayUrlUseCase(repository).execute("ls-1", "tenant-A", "https://example.com/r"),
    ).rejects.toThrow(NotFoundDomainError);
    expect(session.setReplayUrl).not.toHaveBeenCalled();
  });
});
