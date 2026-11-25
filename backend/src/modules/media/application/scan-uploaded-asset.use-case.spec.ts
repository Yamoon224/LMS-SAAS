import { MalwareScannerUnavailableError } from "../domain/malware-scanner.port";
import type { MalwareScannerPort } from "../domain/malware-scanner.port";
import { MediaAssetKind } from "../domain/media-asset-kind";
import { MediaAssetStatus } from "../domain/media-asset-status";
import { MediaAsset } from "../domain/media-asset.entity";
import { StorageObjectNotFoundError } from "../domain/object-storage.port";

import {
  MEDIA_REJECTED_REASON,
  MEDIA_TOO_LARGE_REASON,
  ScanUploadedAssetUseCase,
} from "./scan-uploaded-asset.use-case";

function buildAsset(kind: MediaAssetKind, status = MediaAssetStatus.SCAN_PENDING): MediaAsset {
  return MediaAsset.fromPersistence({
    id: "asset-1",
    tenantId: "tenant-1",
    kind,
    status,
    originalFilename: "cours.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    storageKey: "tenants/tenant-1/key-cours.pdf",
    hlsPrefix: null,
    durationSeconds: null,
    downloadAllowed: false,
    failureReason: null,
  });
}

interface Setup {
  useCase: ScanUploadedAssetUseCase;
  asset: MediaAsset;
  repository: { findById: jest.Mock; save: jest.Mock };
  storage: { openObject: jest.Mock; deleteObject: jest.Mock };
  scanner: { isConfigured: jest.Mock; isRequired: jest.Mock; scan: jest.Mock };
  transcoder: { startTranscoding: jest.Mock };
  emit: jest.Mock;
}

function setup(kind = MediaAssetKind.DOCUMENT, status = MediaAssetStatus.SCAN_PENDING): Setup {
  const asset = buildAsset(kind, status);
  const repository = { findById: jest.fn().mockResolvedValue(asset), save: jest.fn() };
  const storage = {
    openObject: jest.fn().mockResolvedValue((async function* () { yield new Uint8Array([1]); })()),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
  const scanner = { isConfigured: jest.fn().mockReturnValue(true), isRequired: jest.fn().mockReturnValue(false), scan: jest.fn() };
  const transcoder = { startTranscoding: jest.fn().mockResolvedValue({ providerJobId: "job-1" }) };
  const emit = jest.fn();
  const useCase = new ScanUploadedAssetUseCase(
    repository as never,
    storage as never,
    scanner as unknown as MalwareScannerPort,
    transcoder as never,
    { emit } as never,
  );
  return { useCase, asset, repository, storage, scanner, transcoder, emit };
}

describe("ScanUploadedAssetUseCase", () => {
  it("releases a clean non-video file as READY", async () => {
    const s = setup();
    s.scanner.scan.mockResolvedValue({ kind: "CLEAN" });
    await expect(s.useCase.execute("asset-1")).resolves.toBe("RELEASED");
    expect(s.asset.status).toBe(MediaAssetStatus.READY);
    expect(s.emit).toHaveBeenCalledWith("media-asset.ready", expect.anything());
    expect(s.storage.deleteObject).not.toHaveBeenCalled();
  });

  it("starts transcoding only after a clean scan for a video", async () => {
    const s = setup(MediaAssetKind.VIDEO);
    s.scanner.scan.mockResolvedValue({ kind: "CLEAN" });
    await s.useCase.execute("asset-1");
    expect(s.asset.status).toBe(MediaAssetStatus.PROCESSING);
    expect(s.transcoder.startTranscoding).toHaveBeenCalledTimes(1);
  });

  it("deletes an infected file, rejects the asset with a generic reason and never leaks the signature", async () => {
    const s = setup(MediaAssetKind.VIDEO);
    s.scanner.scan.mockResolvedValue({ kind: "INFECTED", signature: "Eicar-Test-Signature" });
    await expect(s.useCase.execute("asset-1")).resolves.toBe("REJECTED");
    expect(s.storage.deleteObject).toHaveBeenCalledWith("tenants/tenant-1/key-cours.pdf");
    expect(s.asset.status).toBe(MediaAssetStatus.REJECTED);
    expect(s.asset.failureReason).toBe(MEDIA_REJECTED_REASON);
    expect(JSON.stringify([s.asset.toSnapshot(), s.emit.mock.calls])).not.toContain("Eicar");
    expect(s.transcoder.startTranscoding).not.toHaveBeenCalled();
    expect(s.emit).toHaveBeenCalledWith(
      "media-asset.rejected",
      expect.objectContaining({ mediaAssetId: "asset-1", tenantId: "tenant-1", reason: "MALWARE_DETECTED" }),
    );
  });

  it("rejects and deletes a file too large to be scanned", async () => {
    const s = setup();
    s.scanner.scan.mockResolvedValue({ kind: "TOO_LARGE" });
    await expect(s.useCase.execute("asset-1")).resolves.toBe("REJECTED");
    expect(s.asset.failureReason).toBe(MEDIA_TOO_LARGE_REASON);
    expect(s.storage.deleteObject).toHaveBeenCalled();
    expect(s.emit).toHaveBeenCalledWith("media-asset.rejected", expect.objectContaining({ reason: "SCAN_SIZE_LIMIT" }));
  });

  it("keeps the asset SCAN_PENDING (never served) when the scanner is unavailable", async () => {
    const s = setup();
    s.scanner.scan.mockRejectedValue(new MalwareScannerUnavailableError("coupure"));
    await expect(s.useCase.execute("asset-1")).resolves.toBe("RETRY_LATER");
    expect(s.asset.status).toBe(MediaAssetStatus.SCAN_PENDING);
    expect(s.asset.isReady()).toBe(false);
    expect(s.repository.save).not.toHaveBeenCalled();
    expect(s.storage.deleteObject).not.toHaveBeenCalled();
  });

  it("retries later when the storage read fails for another reason", async () => {
    const s = setup();
    s.storage.openObject.mockRejectedValue(new Error("S3 indisponible"));
    await expect(s.useCase.execute("asset-1")).resolves.toBe("RETRY_LATER");
    expect(s.asset.status).toBe(MediaAssetStatus.SCAN_PENDING);
  });

});

describe("ScanUploadedAssetUseCase - stockage", () => {
  it("marks the asset FAILED when the upload never reached the storage", async () => {
    const s = setup();
    s.storage.openObject.mockRejectedValue(new StorageObjectNotFoundError("k"));
    await expect(s.useCase.execute("asset-1")).resolves.toBe("FAILED");
    expect(s.asset.status).toBe(MediaAssetStatus.FAILED);
  });

  it("still rejects the asset when deleting the infected file fails", async () => {
    const s = setup();
    s.scanner.scan.mockResolvedValue({ kind: "INFECTED", signature: "X" });
    s.storage.deleteObject.mockRejectedValue(new Error("S3 down"));
    await expect(s.useCase.execute("asset-1")).resolves.toBe("REJECTED");
    expect(s.asset.status).toBe(MediaAssetStatus.REJECTED);
  });

});

describe("ScanUploadedAssetUseCase - configuration et concurrence", () => {
  it("without a configured scanner and not required: releases with a warning (development)", async () => {
    const s = setup();
    s.scanner.isConfigured.mockReturnValue(false);
    await expect(s.useCase.execute("asset-1")).resolves.toBe("RELEASED");
    expect(s.scanner.scan).not.toHaveBeenCalled();
    expect(s.asset.status).toBe(MediaAssetStatus.READY);
  });

  it("without a configured scanner but MEDIA_SCAN_REQUIRED: stays pending and is never served", async () => {
    const s = setup();
    s.scanner.isConfigured.mockReturnValue(false);
    s.scanner.isRequired.mockReturnValue(true);
    await expect(s.useCase.execute("asset-1")).resolves.toBe("RETRY_LATER");
    expect(s.asset.status).toBe(MediaAssetStatus.SCAN_PENDING);
    expect(s.repository.save).not.toHaveBeenCalled();
  });

  it("ignores assets that are not pending (already ready, rejected) or unknown", async () => {
    const ready = setup(MediaAssetKind.DOCUMENT, MediaAssetStatus.READY);
    await expect(ready.useCase.execute("asset-1")).resolves.toBe("SKIPPED");
    const rejected = setup(MediaAssetKind.DOCUMENT, MediaAssetStatus.REJECTED);
    await expect(rejected.useCase.execute("asset-1")).resolves.toBe("SKIPPED");
    const unknown = setup();
    unknown.repository.findById.mockResolvedValue(null);
    await expect(unknown.useCase.execute("nope")).resolves.toBe("SKIPPED");
    expect(ready.scanner.scan).not.toHaveBeenCalled();
  });

  it("does not scan the same asset twice in parallel", async () => {
    const s = setup();
    let release!: () => void;
    s.scanner.scan.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ kind: "CLEAN" }); }),
    );
    const first = s.useCase.execute("asset-1");
    await new Promise((resolve) => setImmediate(resolve));
    await expect(s.useCase.execute("asset-1")).resolves.toBe("SKIPPED");
    release();
    await first;
    expect(s.scanner.scan).toHaveBeenCalledTimes(1);
  });
});
