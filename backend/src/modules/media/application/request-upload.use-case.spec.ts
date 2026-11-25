import type { PlansFacade } from "@modules/plans/plans.facade";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { MediaTooLargeError, StorageQuotaExceededError, UnsupportedMediaTypeError } from "../domain/media-asset-kind";
import { MediaAssetStatus } from "../domain/media-asset-status";
import { MediaAsset } from "../domain/media-asset.entity";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import type { ObjectStoragePort } from "../domain/object-storage.port";

import { DeleteMediaAssetUseCase } from "./delete-media-asset.use-case";
import { RequestUploadUseCase } from "./request-upload.use-case";

function buildRepositoryMock(): MediaAssetRepositoryPort {
  return {
    findById: jest.fn(),
    findByIdInTenant: jest.fn(),
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve(
        MediaAsset.fromPersistence({
          id: "asset-1",
          tenantId: data.tenantId,
          kind: data.kind,
          status: MediaAssetStatus.UPLOADING,
          originalFilename: data.originalFilename,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          storageKey: data.storageKey,
          hlsPrefix: null,
          durationSeconds: null,
          downloadAllowed: data.downloadAllowed,
          failureReason: null,
        }),
      ),
    ),
    save: jest.fn(),
    listProcessing: jest.fn(),
    listScanPending: jest.fn(),
    delete: jest.fn(),
    sumSizeBytesForTenant: jest.fn().mockResolvedValue(0),
  };
}

function buildPlansMock(limitGb: number | null = null): PlansFacade {
  return {
    checkQuota: jest.fn().mockResolvedValue({ withinLimit: true, current: 0, limit: limitGb }),
  } as unknown as PlansFacade;
}

function buildStorageMock(): ObjectStoragePort {
  return {
    createPresignedUpload: jest.fn().mockResolvedValue({
      uploadUrl: "https://s3.example.com/upload",
      storageKey: "tenants/tenant-1/video.mp4",
      requiredHeaders: { "Content-Type": "video/mp4" },
      expiresAt: new Date(),
    }),
    deleteObject: jest.fn(),
    openObject: jest.fn(),
    createSignedPlaybackUrl: jest.fn(),
  };
}

describe("RequestUploadUseCase", () => {
  it("creates a media asset and returns the presigned upload for a valid file", async () => {
    const repository = buildRepositoryMock();
    const storage = buildStorageMock();
    const useCase = new RequestUploadUseCase(repository, storage, buildPlansMock());

    const result = await useCase.execute({
      tenantId: "tenant-1",
      filename: "video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1024,
      downloadAllowed: false,
    });

    expect(result.mediaAssetId).toBe("asset-1");
    expect(storage.createPresignedUpload).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      filename: "video.mp4",
      mimeType: "video/mp4",
    });
  });

  it("rejects a file exceeding the size limit before requesting an upload URL (BE-09)", async () => {
    const repository = buildRepositoryMock();
    const storage = buildStorageMock();
    const useCase = new RequestUploadUseCase(repository, storage, buildPlansMock());

    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        filename: "huge.mp4",
        mimeType: "video/mp4",
        sizeBytes: 3 * 1024 * 1024 * 1024,
        downloadAllowed: false,
      }),
    ).rejects.toThrow(MediaTooLargeError);

    expect(storage.createPresignedUpload).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

});

describe("RequestUploadUseCase (abus)", () => {
  it.each(["application/x-msdownload", "application/zip", "text/html", "image/svg+xml", "application/x-sh"])(
    "rejects the forbidden MIME type %s without requesting an upload URL",
    async (mimeType) => {
      const repository = buildRepositoryMock();
      const storage = buildStorageMock();
      const useCase = new RequestUploadUseCase(repository, storage, buildPlansMock());

      await expect(
        useCase.execute({ tenantId: "tenant-1", filename: "x.bin", mimeType, sizeBytes: 10, downloadAllowed: true }),
      ).rejects.toThrow(UnsupportedMediaTypeError);
      expect(storage.createPresignedUpload).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it("refuses the upload when the plan storage quota would be exceeded", async () => {
    const repository = buildRepositoryMock();
    (repository.sumSizeBytesForTenant as jest.Mock).mockResolvedValue(1024 * 1024 * 1024 - 100);
    const storage = buildStorageMock();
    const useCase = new RequestUploadUseCase(repository, storage, buildPlansMock(1));

    await expect(
      useCase.execute({ tenantId: "tenant-1", filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 101, downloadAllowed: true }),
    ).rejects.toThrow(StorageQuotaExceededError);
    expect(storage.createPresignedUpload).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("accepts the upload that exactly fills the storage quota", async () => {
    const repository = buildRepositoryMock();
    (repository.sumSizeBytesForTenant as jest.Mock).mockResolvedValue(1024 * 1024 * 1024 - 100);
    const useCase = new RequestUploadUseCase(repository, buildStorageMock(), buildPlansMock(1));

    await expect(
      useCase.execute({ tenantId: "tenant-1", filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 100, downloadAllowed: true }),
    ).resolves.toBeDefined();
  });
});

describe("DeleteMediaAssetUseCase (tenant isolation)", () => {
  it("returns 404 and deletes nothing for an asset of another tenant", async () => {
    const repository = buildRepositoryMock();
    (repository.findByIdInTenant as jest.Mock).mockResolvedValue(null);
    const storage = buildStorageMock();
    const useCase = new DeleteMediaAssetUseCase(repository, storage);

    await expect(useCase.execute("asset-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("asset-1", "tenant-A");
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("removes the file and the row for an asset of the caller's tenant, even if the storage fails", async () => {
    const repository = buildRepositoryMock();
    (repository.findByIdInTenant as jest.Mock).mockResolvedValue({ id: "asset-1", storageKey: "tenants/t/x.pdf" });
    const storage = buildStorageMock();
    (storage.deleteObject as jest.Mock).mockRejectedValue(new Error("boom"));
    const useCase = new DeleteMediaAssetUseCase(repository, storage);

    await useCase.execute("asset-1", "tenant-1");
    expect(repository.delete).toHaveBeenCalledWith("asset-1");
  });
});

describe("DeleteMediaAssetUseCase.abandon", () => {
  it.each([MediaAssetStatus.READY, MediaAssetStatus.PROCESSING, MediaAssetStatus.SCAN_PENDING])(
    "refuses to abandon a %s media (409) and keeps it",
    async (status) => {
      const repository = buildRepositoryMock();
      (repository.findByIdInTenant as jest.Mock).mockResolvedValue({ id: "a", status, storageKey: "k" });
      const useCase = new DeleteMediaAssetUseCase(repository, buildStorageMock());
      await expect(useCase.abandon("a", "t")).rejects.toThrow(InvalidStateTransitionError);
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it("abandons an uploading media of the tenant, and answers 404 for another tenant", async () => {
    const repository = buildRepositoryMock();
    (repository.findByIdInTenant as jest.Mock).mockResolvedValueOnce({ id: "a", status: MediaAssetStatus.UPLOADING, storageKey: "k" });
    const useCase = new DeleteMediaAssetUseCase(repository, buildStorageMock());
    await useCase.abandon("a", "t");
    expect(repository.delete).toHaveBeenCalledWith("a");

    (repository.findByIdInTenant as jest.Mock).mockResolvedValueOnce(null);
    await expect(useCase.abandon("a", "other")).rejects.toThrow(NotFoundDomainError);
  });
});
