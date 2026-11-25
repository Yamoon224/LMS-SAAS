import { NotFoundDomainError } from "@shared/errors";

import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import type { ObjectStoragePort } from "../domain/object-storage.port";

import { ConfirmUploadUseCase } from "./confirm-upload.use-case";
import { GetPlaybackUrlUseCase } from "./get-playback-url.use-case";

function repositoryFor(asset: unknown): MediaAssetRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(asset),
    findByIdInTenant: jest.fn().mockResolvedValue(asset),
    save: jest.fn(),
  } as unknown as MediaAssetRepositoryPort;
}

describe("Media asset tenant ownership", () => {
  it("looks the asset up within the caller's tenant when confirming an upload", async () => {
    const repository = repositoryFor(null);
    const useCase = new ConfirmUploadUseCase(repository, { execute: jest.fn() } as never);
    await expect(useCase.execute("asset-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("asset-1", "tenant-A");
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("does not confirm (nor save) an asset of another tenant", async () => {
    const repository = repositoryFor(null);
    const scan = { execute: jest.fn() };
    const useCase = new ConfirmUploadUseCase(repository, scan as never);
    await expect(useCase.execute("asset-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(scan.execute).not.toHaveBeenCalled();
  });

  it("does not sign a playback URL for an asset of another tenant", async () => {
    const repository = repositoryFor(null);
    const storage = { createSignedPlaybackUrl: jest.fn() };
    const useCase = new GetPlaybackUrlUseCase(repository, storage as unknown as ObjectStoragePort);
    await expect(useCase.execute("asset-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("asset-1", "tenant-A");
    expect(storage.createSignedPlaybackUrl).not.toHaveBeenCalled();
  });

  it("signs a playback URL for a ready asset of the tenant", async () => {
    const asset = { isReady: () => true, hlsPrefix: "hls/t/a", storageKey: "k" };
    const repository = repositoryFor(asset);
    const storage = { createSignedPlaybackUrl: jest.fn().mockResolvedValue({ url: "https://signed" }) };
    const useCase = new GetPlaybackUrlUseCase(repository, storage as unknown as ObjectStoragePort);
    await expect(useCase.execute("asset-1", "tenant-A")).resolves.toEqual({ url: "https://signed" });
    expect(storage.createSignedPlaybackUrl).toHaveBeenCalledWith("hls/t/a", expect.any(Number));
  });
});
