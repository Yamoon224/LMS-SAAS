import { NotFoundDomainError } from "@shared/errors";

import type { CertificateStoragePort } from "../domain/certificate-storage.port";
import type { CertificateRepositoryPort } from "../domain/certificate.repository.port";

import { GetCertificateDownloadUrlUseCase } from "./get-certificate-download-url.use-case";
import { RevokeCertificateUseCase } from "./revoke-certificate.use-case";

function repositoryFor(certificate: unknown): CertificateRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(certificate),
    findByIdInTenant: jest.fn().mockResolvedValue(certificate),
    save: jest.fn(),
  } as unknown as CertificateRepositoryPort;
}

describe("Certificate tenant ownership", () => {
  it("revokes through the tenant-scoped lookup", async () => {
    const certificate = { revoke: jest.fn() };
    const repository = repositoryFor(certificate);
    await new RevokeCertificateUseCase(repository).execute("cert-1", "tenant-1", "Fraude");
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("cert-1", "tenant-1");
    expect(certificate.revoke).toHaveBeenCalledWith("Fraude");
  });

  it("raises NotFound when the certificate is not in the tenant", async () => {
    const repository = repositoryFor(null);
    await expect(new RevokeCertificateUseCase(repository).execute("cert-1", "tenant-1", "x")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("scopes the download URL by tenant when given, and stays unscoped for internal callers", async () => {
    const storage = {
      createSignedDownloadUrl: jest.fn().mockResolvedValue("https://signed"),
    } as unknown as CertificateStoragePort;
    const repository = repositoryFor({ pdfUrl: "key" });
    const useCase = new GetCertificateDownloadUrlUseCase(repository, storage);

    await useCase.execute("cert-1", "tenant-1");
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("cert-1", "tenant-1");

    await useCase.execute("cert-1");
    expect(repository.findById).toHaveBeenCalledWith("cert-1");
  });

  it("raises NotFound for a download from another tenant", async () => {
    const storage = { createSignedDownloadUrl: jest.fn() } as unknown as CertificateStoragePort;
    const useCase = new GetCertificateDownloadUrlUseCase(repositoryFor(null), storage);
    await expect(useCase.execute("cert-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  });
});
