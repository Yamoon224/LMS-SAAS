import { InvalidStateTransitionError } from "@shared/errors";

import { MediaAssetKind } from "./media-asset-kind";
import { MediaAssetStatus } from "./media-asset-status";
import { MediaAsset } from "./media-asset.entity";

function buildAsset(status: MediaAssetStatus, kind: MediaAssetKind = MediaAssetKind.VIDEO): MediaAsset {
  return MediaAsset.fromPersistence({
    id: "asset-1",
    tenantId: "tenant-1",
    kind,
    status,
    originalFilename: "intro.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    storageKey: "tenants/tenant-1/intro.mp4",
    hlsPrefix: null,
    durationSeconds: null,
    downloadAllowed: false,
    failureReason: null,
  });
}

describe("MediaAsset entity - accessors", () => {
  it("exposes its properties and an immutable snapshot", () => {
    const asset = buildAsset(MediaAssetStatus.UPLOADING);
    expect(asset.tenantId).toBe("tenant-1");
    expect(asset.kind).toBe(MediaAssetKind.VIDEO);
    expect(asset.originalFilename).toBe("intro.mp4");
    expect(asset.mimeType).toBe("video/mp4");
    expect(asset.sizeBytes).toBe(1024);
    expect(asset.downloadAllowed).toBe(false);
    expect(asset.failureReason).toBeNull();
    expect(asset.hlsPrefix).toBeNull();
    const snapshot = asset.toSnapshot();
    expect(snapshot.storageKey).toBe("tenants/tenant-1/intro.mp4");
    asset.markFailed("x");
    expect(snapshot.status).toBe(MediaAssetStatus.UPLOADING);
    asset.retry();
    expect(asset.failureReason).toBeNull();
  });
});

describe("MediaAsset entity - lifecycle", () => {
  it("is ready only in READY status", () => {
    expect(buildAsset(MediaAssetStatus.READY).isReady()).toBe(true);
    expect(buildAsset(MediaAssetStatus.UPLOADING).isReady()).toBe(false);
    expect(buildAsset(MediaAssetStatus.PROCESSING).isReady()).toBe(false);
    expect(buildAsset(MediaAssetStatus.FAILED).isReady()).toBe(false);
  });

  it("starts processing from uploading", () => {
    const asset = buildAsset(MediaAssetStatus.UPLOADING);
    asset.startProcessing();
    expect(asset.status).toBe(MediaAssetStatus.PROCESSING);
  });

  it("marks ready directly from uploading for non-video assets", () => {
    const asset = buildAsset(MediaAssetStatus.UPLOADING, MediaAssetKind.IMAGE);
    asset.markReady();
    expect(asset.status).toBe(MediaAssetStatus.READY);
    expect(asset.hlsPrefix).toBeNull();
  });

  it("marks ready from processing with an HLS prefix for video", () => {
    const asset = buildAsset(MediaAssetStatus.PROCESSING);
    asset.markReady("hls/tenant-1/asset-1", 120);
    expect(asset.status).toBe(MediaAssetStatus.READY);
    expect(asset.hlsPrefix).toBe("hls/tenant-1/asset-1");
  });

  it("marks failed from processing with a reason", () => {
    const asset = buildAsset(MediaAssetStatus.PROCESSING);
    asset.markFailed("Fichier source corrompu");
    expect(asset.status).toBe(MediaAssetStatus.FAILED);
  });

  it("allows retrying after a failure", () => {
    const asset = buildAsset(MediaAssetStatus.FAILED);
    asset.retry();
    expect(asset.status).toBe(MediaAssetStatus.UPLOADING);
  });

  it("rejects any transition out of ready", () => {
    const asset = buildAsset(MediaAssetStatus.READY);
    expect(() => asset.startProcessing()).toThrow(InvalidStateTransitionError);
    expect(() => asset.markFailed("x")).toThrow(InvalidStateTransitionError);
  });

  it("rejects starting processing from ready or failed", () => {
    expect(() => buildAsset(MediaAssetStatus.READY).startProcessing()).toThrow(
      InvalidStateTransitionError,
    );
    expect(() => buildAsset(MediaAssetStatus.FAILED).startProcessing()).toThrow(
      InvalidStateTransitionError,
    );
  });
});

describe("MediaAsset entity - analyse antivirus", () => {
  it("passes through SCAN_PENDING and is not served while pending", () => {
    const asset = buildAsset(MediaAssetStatus.UPLOADING);
    asset.markScanPending();
    expect(asset.isScanPending()).toBe(true);
    expect(asset.isReady()).toBe(false);
  });

  it("can start processing or become ready only after the scan phase", () => {
    const video = buildAsset(MediaAssetStatus.SCAN_PENDING);
    video.startProcessing();
    expect(video.status).toBe(MediaAssetStatus.PROCESSING);
    const image = buildAsset(MediaAssetStatus.SCAN_PENDING, MediaAssetKind.IMAGE);
    image.markReady();
    expect(image.isReady()).toBe(true);
  });

  it("rejects with a generic reason and the rejection is final", () => {
    const asset = buildAsset(MediaAssetStatus.SCAN_PENDING);
    asset.reject("Fichier refusé par l'analyse de sécurité.");
    expect(asset.status).toBe(MediaAssetStatus.REJECTED);
    expect(asset.failureReason).toBe("Fichier refusé par l'analyse de sécurité.");
    expect(() => asset.markReady()).toThrow(InvalidStateTransitionError);
    expect(() => asset.startProcessing()).toThrow(InvalidStateTransitionError);
    expect(() => asset.retry()).toThrow(InvalidStateTransitionError);
  });

  it("cannot reject an asset that was already released", () => {
    expect(() => buildAsset(MediaAssetStatus.READY).reject("x")).toThrow(InvalidStateTransitionError);
  });
});
