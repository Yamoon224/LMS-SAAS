import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";

import { ConfirmTranslationUseCase } from "./confirm-translation.use-case";
import { ListTranslationJobsUseCase } from "./list-translation-jobs.use-case";

const jobOf = (tenantId: string) => ({ id: "job-1", toSnapshot: () => ({ tenantId }) });

describe("Translation tenant ownership", () => {
  it("does not confirm (nor debit) a job of another tenant", async () => {
    const jobs = {
      findById: jest.fn().mockResolvedValue(jobOf("tenant-B")),
      save: jest.fn(),
    } as unknown as TranslationJobRepositoryPort;
    const wallets = { findByTenantId: jest.fn(), save: jest.fn() } as unknown as CreditWalletRepositoryPort;
    const useCase = new ConfirmTranslationUseCase(jobs, wallets, { emit: jest.fn() } as unknown as EventEmitter2);

    await expect(useCase.execute("job-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(wallets.findByTenantId).not.toHaveBeenCalled();
    expect(wallets.save).not.toHaveBeenCalled();
  });

  it("only lists the jobs of the caller's tenant", async () => {
    const jobs = {
      listByCourse: jest.fn().mockResolvedValue([jobOf("tenant-A"), { ...jobOf("tenant-B"), id: "job-2" }]),
    } as unknown as TranslationJobRepositoryPort;
    const result = await new ListTranslationJobsUseCase(jobs).listForCourse("course-1", "tenant-A");
    expect(result.map((job) => job.id)).toEqual(["job-1"]);
  });
});
