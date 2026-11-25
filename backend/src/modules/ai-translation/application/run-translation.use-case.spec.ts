import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";

import { TranslationConfirmedEvent } from "../ai-translation.events";
import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CreditWallet } from "../domain/credit-wallet.entity";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";
import { TranslationJobStatus } from "../domain/translation-job-status";
import { TranslationJob } from "../domain/translation-job.entity";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";
import type { TranslationProviderPort } from "../domain/translation-provider.port";

import { RunTranslationUseCase } from "./run-translation.use-case";

function buildJob(debitedCredits: number | null = 20): TranslationJob {
  return TranslationJob.fromPersistence({
    id: "job-1",
    tenantId: "tenant-1",
    courseId: "course-1",
    targetLocale: "en",
    wordCount: 100,
    estimatedCredits: 20,
    debitedCredits,
    status: TranslationJobStatus.CONFIRMED,
    errorMessage: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: null,
  });
}

function build(job: TranslationJob | null, wallet: CreditWallet | null = null) {
  const jobs = {
    findById: jest.fn().mockResolvedValue(job),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TranslationJobRepositoryPort>;
  const wallets = {
    findByTenantId: jest.fn().mockResolvedValue(wallet),
    save: jest.fn().mockResolvedValue(undefined),
    recordLedgerEntry: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CreditWalletRepositoryPort>;
  const provider = {
    translate: jest.fn().mockImplementation(async ({ content }: { content: string }) => `T(${content})`),
  } as jest.Mocked<TranslationProviderPort>;
  const courses = {
    findById: jest.fn().mockResolvedValue({ id: "course-1", sourceLocale: "fr", title: "Titre" }),
    upsertCourseLocale: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CoursesFacade>;
  const content = {
    listModules: jest.fn().mockResolvedValue([{ id: "m1" }]),
    listLessons: jest.fn().mockResolvedValue([
      { id: "l1", title: "Leçon 1", contentHtml: "<p>Bonjour</p>" },
      { id: "l2", title: "Leçon 2", contentHtml: null },
    ]),
    upsertLessonLocale: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CourseContentFacade>;
  const useCase = new RunTranslationUseCase(jobs, wallets, provider, courses, content);
  return { useCase, jobs, wallets, provider, courses, content };
}

describe("RunTranslationUseCase", () => {
  it("ignore un job introuvable sans rien traduire", async () => {
    const { useCase, jobs, provider } = build(null);
    await useCase.handle(new TranslationConfirmedEvent("absent"));
    expect(jobs.save).not.toHaveBeenCalled();
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it("traduit la fiche et les leçons, écrit via les façades et termine le job", async () => {
    const job = buildJob();
    const { useCase, jobs, provider, courses, content, wallets } = build(job);

    await useCase.handle(new TranslationConfirmedEvent("job-1"));

    expect(courses.upsertCourseLocale).toHaveBeenCalledWith({
      courseId: "course-1",
      locale: "en",
      title: "T(Titre)",
      subtitle: null,
      description: null,
      origin: "AI",
    });
    expect(content.upsertLessonLocale).toHaveBeenCalledWith({
      lessonId: "l1",
      locale: "en",
      title: "T(Leçon 1)",
      contentHtml: "T(<p>Bonjour</p>)",
      origin: "AI",
    });
    expect(content.upsertLessonLocale).toHaveBeenCalledWith({
      lessonId: "l2",
      locale: "en",
      title: "T(Leçon 2)",
      contentHtml: null,
      origin: "AI",
    });
    // titre fiche + (titre + contenu) leçon 1 + titre leçon 2 (pas de contenu)
    expect(provider.translate).toHaveBeenCalledTimes(4);
    expect(job.status).toBe(TranslationJobStatus.COMPLETED);
    expect(jobs.save).toHaveBeenCalledTimes(2);
    expect(wallets.recordLedgerEntry).not.toHaveBeenCalled();
  });

  it("recrédite intégralement le portefeuille et marque le job en échec si le fournisseur échoue", async () => {
    const job = buildJob(20);
    const wallet = CreditWallet.fromPersistence({ id: "w1", tenantId: "tenant-1", balance: 5 });
    const { useCase, jobs, provider, wallets } = build(job, wallet);
    provider.translate.mockRejectedValue(new Error("Fournisseur HS"));

    await useCase.handle(new TranslationConfirmedEvent("job-1"));

    expect(wallet.balance).toBe(25);
    expect(wallets.save).toHaveBeenCalledWith(wallet);
    expect(wallets.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: "w1",
        type: CreditLedgerType.REFUND,
        amount: 20,
        translationJobId: "job-1",
      }),
    );
    expect(job.status).toBe(TranslationJobStatus.FAILED);
    expect(job.toSnapshot().errorMessage).toBe("Fournisseur HS");
    expect(jobs.save).toHaveBeenLastCalledWith(job);
  });

  it("utilise un message générique quand l'erreur n'est pas une Error", async () => {
    const job = buildJob(20);
    const { useCase, provider } = build(job, CreditWallet.fromPersistence({ id: "w1", tenantId: "tenant-1", balance: 0 }));
    provider.translate.mockRejectedValue("boom");

    await useCase.handle(new TranslationConfirmedEvent("job-1"));

    expect(job.toSnapshot().errorMessage).toBe("Erreur inconnue du fournisseur de traduction.");
  });

  it("n'écrit aucun remboursement si aucun crédit n'a été débité", async () => {
    const job = buildJob(null);
    const { useCase, provider, wallets } = build(job);
    provider.translate.mockRejectedValue(new Error("x"));

    await useCase.handle(new TranslationConfirmedEvent("job-1"));

    expect(wallets.findByTenantId).not.toHaveBeenCalled();
    expect(job.status).toBe(TranslationJobStatus.FAILED);
  });

  it("échoue le job sans remboursement si le portefeuille est introuvable", async () => {
    const job = buildJob(20);
    const { useCase, provider, wallets } = build(job, null);
    provider.translate.mockRejectedValue(new Error("x"));

    await useCase.handle(new TranslationConfirmedEvent("job-1"));

    expect(wallets.save).not.toHaveBeenCalled();
    expect(wallets.recordLedgerEntry).not.toHaveBeenCalled();
    expect(job.status).toBe(TranslationJobStatus.FAILED);
  });
});
