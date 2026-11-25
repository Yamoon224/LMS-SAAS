import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { MediaAssetKind } from "../domain/media-asset-kind";
import { MediaAssetStatus } from "../domain/media-asset-status";
import { MediaAsset } from "../domain/media-asset.entity";
import { MediaTranscodingCompletedEvent, MediaTranscodingFailedEvent } from "../media.events";

import { CompleteTranscodingUseCase } from "./complete-transcoding.use-case";

function buildAsset(status: MediaAssetStatus): MediaAsset {
  return MediaAsset.fromPersistence({
    id: "asset-1",
    tenantId: "tenant-1",
    kind: MediaAssetKind.VIDEO,
    status,
    originalFilename: "intro.mp4",
    mimeType: "video/mp4",
    sizeBytes: 10,
    storageKey: "tenants/tenant-1/intro.mp4",
    hlsPrefix: null,
    durationSeconds: null,
    downloadAllowed: false,
    failureReason: null,
  });
}

function setup(asset: MediaAsset | null) {
  const repository = { findById: jest.fn().mockResolvedValue(asset), save: jest.fn().mockResolvedValue(undefined) };
  const emit = jest.fn();
  const useCase = new CompleteTranscodingUseCase(repository as never, { emit } as never);
  return { useCase, repository, emit };
}

describe("CompleteTranscodingUseCase", () => {
  it("marks the asset ready, saves it and emits the completed event", async () => {
    const asset = buildAsset(MediaAssetStatus.PROCESSING);
    const { useCase, repository, emit } = setup(asset);

    await useCase.succeed("asset-1", "hls/asset-1", 120);

    expect(asset.status).toBe(MediaAssetStatus.READY);
    expect(asset.hlsPrefix).toBe("hls/asset-1");
    expect(asset.toSnapshot().durationSeconds).toBe(120);
    expect(repository.save).toHaveBeenCalledWith(asset);
    expect(emit).toHaveBeenCalledWith(
      "media-asset.transcoding-completed",
      expect.any(MediaTranscodingCompletedEvent),
    );
    expect(emit.mock.calls[0][1]).toMatchObject({ mediaAssetId: "asset-1", tenantId: "tenant-1" });
  });

  it("marks the asset failed with the reason and emits the failed event", async () => {
    const asset = buildAsset(MediaAssetStatus.PROCESSING);
    const { useCase, repository, emit } = setup(asset);

    await useCase.fail("asset-1", "codec");

    expect(asset.status).toBe(MediaAssetStatus.FAILED);
    expect(asset.failureReason).toBe("codec");
    expect(repository.save).toHaveBeenCalledWith(asset);
    expect(emit).toHaveBeenCalledWith("media-asset.transcoding-failed", expect.any(MediaTranscodingFailedEvent));
    expect(emit.mock.calls[0][1]).toMatchObject({ mediaAssetId: "asset-1", reason: "codec" });
  });

  it("throws NotFound when the asset does not exist (succeed and fail)", async () => {
    const { useCase, repository, emit } = setup(null);

    await expect(useCase.succeed("x", "p", 1)).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.fail("x", "r")).rejects.toThrow(NotFoundDomainError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("refuses an invalid transition and publishes nothing", async () => {
    const { useCase, repository, emit } = setup(buildAsset(MediaAssetStatus.READY));

    await expect(useCase.succeed("asset-1", "p", 1)).rejects.toThrow(InvalidStateTransitionError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
