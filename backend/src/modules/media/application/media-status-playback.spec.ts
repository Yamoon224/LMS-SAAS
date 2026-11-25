import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { MediaAssetKind } from "../domain/media-asset-kind";
import { MediaAssetStatus } from "../domain/media-asset-status";
import { MediaAsset } from "../domain/media-asset.entity";

import { ConfirmUploadUseCase } from "./confirm-upload.use-case";
import { GetMediaAssetStatusUseCase } from "./get-media-asset-status.use-case";
import { GetPlaybackUrlUseCase, MediaAssetNotReadyError } from "./get-playback-url.use-case";

function buildAsset(status: MediaAssetStatus, hlsPrefix: string | null = null, failureReason: string | null = null) {
  return MediaAsset.fromPersistence({
    id: "asset-1",
    tenantId: "tenant-1",
    kind: MediaAssetKind.VIDEO,
    status,
    originalFilename: "intro.mp4",
    mimeType: "video/mp4",
    sizeBytes: 42,
    storageKey: "tenants/tenant-1/intro.mp4",
    hlsPrefix,
    durationSeconds: null,
    downloadAllowed: true,
    failureReason,
  });
}

describe("GetMediaAssetStatusUseCase", () => {
  const run = (asset: MediaAsset | null) => {
    const repo = { findByIdInTenant: jest.fn().mockResolvedValue(asset) };
    return { repo, useCase: new GetMediaAssetStatusUseCase(repo as never) };
  };

  it("exposes the reason for a REJECTED asset", async () => {
    const { useCase, repo } = run(buildAsset(MediaAssetStatus.REJECTED, null, "refusé"));
    const view = await useCase.execute("asset-1", "tenant-1");
    expect(repo.findByIdInTenant).toHaveBeenCalledWith("asset-1", "tenant-1");
    expect(view).toEqual({
      mediaAssetId: "asset-1",
      kind: MediaAssetKind.VIDEO,
      filename: "intro.mp4",
      mimeType: "video/mp4",
      sizeBytes: 42,
      downloadAllowed: true,
      status: MediaAssetStatus.REJECTED,
      reason: "refusé",
    });
  });

  it("exposes the reason for a FAILED asset", async () => {
    const { useCase } = run(buildAsset(MediaAssetStatus.FAILED, null, "boom"));
    expect((await useCase.execute("asset-1", "tenant-1")).reason).toBe("boom");
  });

  it("hides the reason for other states", async () => {
    const { useCase } = run(buildAsset(MediaAssetStatus.READY, null, "stale"));
    expect((await useCase.execute("asset-1", "tenant-1")).reason).toBeNull();
  });

  it("throws NotFound for an unknown asset", async () => {
    const { useCase } = run(null);
    await expect(useCase.execute("x", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("GetPlaybackUrlUseCase", () => {
  const run = (asset: MediaAsset | null) => {
    const repo = { findByIdInTenant: jest.fn().mockResolvedValue(asset) };
    const storage = { createSignedPlaybackUrl: jest.fn().mockResolvedValue({ url: "https://signed" }) };
    return { storage, useCase: new GetPlaybackUrlUseCase(repo as never, storage as never) };
  };

  it("signs the HLS prefix for 30 minutes when present", async () => {
    const { useCase, storage } = run(buildAsset(MediaAssetStatus.READY, "hls/asset-1"));
    await expect(useCase.execute("asset-1", "tenant-1")).resolves.toEqual({ url: "https://signed" });
    expect(storage.createSignedPlaybackUrl).toHaveBeenCalledWith("hls/asset-1", 1800);
  });

  it("falls back to the storage key without HLS prefix", async () => {
    const { useCase, storage } = run(buildAsset(MediaAssetStatus.READY));
    await useCase.execute("asset-1", "tenant-1");
    expect(storage.createSignedPlaybackUrl).toHaveBeenCalledWith("tenants/tenant-1/intro.mp4", 1800);
  });

  it("refuses a not ready asset", async () => {
    const { useCase, storage } = run(buildAsset(MediaAssetStatus.PROCESSING));
    await expect(useCase.execute("asset-1", "tenant-1")).rejects.toThrow(MediaAssetNotReadyError);
    expect(storage.createSignedPlaybackUrl).not.toHaveBeenCalled();
  });

  it("throws NotFound for an unknown asset", async () => {
    const { useCase } = run(null);
    await expect(useCase.execute("x", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("ConfirmUploadUseCase", () => {
  const run = (asset: MediaAsset | null, scanImpl?: jest.Mock) => {
    const repo = { findByIdInTenant: jest.fn().mockResolvedValue(asset), save: jest.fn().mockResolvedValue(undefined) };
    const scan = { execute: scanImpl ?? jest.fn().mockResolvedValue(undefined) };
    return { repo, scan, useCase: new ConfirmUploadUseCase(repo as never, scan as never) };
  };

  it("moves the asset to SCAN_PENDING, saves and triggers the scan", async () => {
    const asset = buildAsset(MediaAssetStatus.UPLOADING);
    const { useCase, repo, scan } = run(asset);
    await useCase.execute("asset-1", "tenant-1");
    expect(asset.status).toBe(MediaAssetStatus.SCAN_PENDING);
    expect(repo.save).toHaveBeenCalledWith(asset);
    expect(scan.execute).toHaveBeenCalledWith("asset-1");
  });

  it("is idempotent for an asset already pending (no save, scan still triggered)", async () => {
    const { useCase, repo, scan } = run(buildAsset(MediaAssetStatus.SCAN_PENDING));
    await useCase.execute("asset-1", "tenant-1");
    expect(repo.save).not.toHaveBeenCalled();
    expect(scan.execute).toHaveBeenCalledTimes(1);
  });

  it("does not propagate a background scan failure", async () => {
    const { useCase } = run(buildAsset(MediaAssetStatus.UPLOADING), jest.fn().mockRejectedValue(new Error("down")));
    await expect(useCase.execute("asset-1", "tenant-1")).resolves.toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it("throws NotFound when the asset is not in the tenant", async () => {
    const { useCase, scan } = run(null);
    await expect(useCase.execute("x", "tenant-1")).rejects.toThrow(NotFoundDomainError);
    expect(scan.execute).not.toHaveBeenCalled();
  });

  it("rejects an invalid transition (READY asset)", async () => {
    const { useCase, scan } = run(buildAsset(MediaAssetStatus.READY));
    await expect(useCase.execute("asset-1", "tenant-1")).rejects.toThrow(InvalidStateTransitionError);
    expect(scan.execute).not.toHaveBeenCalled();
  });
});
