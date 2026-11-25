import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { TranslationConfirmedEvent } from "../ai-translation.events";
import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";
import type { TranslationJob } from "../domain/translation-job.entity";
import { TRANSLATION_JOB_REPOSITORY } from "../domain/translation-job.repository.port";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";
import { TRANSLATION_PROVIDER } from "../domain/translation-provider.port";
import type { TranslationProviderPort } from "../domain/translation-provider.port";

/**
 * ADM-18: exécute la traduction confirmée de façon asynchrone — traduit la
 * fiche formation et chaque leçon, puis écrit le résultat via les façades de
 * courses et course-content (ce module ne possède pas ces tables). En cas
 * d'échec, les crédits déjà débités sont recrédités intégralement : le
 * gestionnaire ne paie jamais pour une traduction qui n'a pas abouti.
 */
@Injectable()
export class RunTranslationUseCase {
  private readonly logger = new Logger(RunTranslationUseCase.name);

  constructor(
    @Inject(TRANSLATION_JOB_REPOSITORY) private readonly jobRepository: TranslationJobRepositoryPort,
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
    @Inject(TRANSLATION_PROVIDER) private readonly translationProvider: TranslationProviderPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
  ) {}

  @OnEvent("translation.confirmed")
  async handle(event: TranslationConfirmedEvent): Promise<void> {
    const job = await this.jobRepository.findById(event.jobId);
    if (!job) {
      this.logger.warn(`Job de traduction introuvable: ${event.jobId}`);
      return;
    }

    job.start();
    await this.jobRepository.save(job);

    try {
      const snapshot = job.toSnapshot();
      const course = await this.coursesFacade.findById(snapshot.courseId);

      await this.translateCourseSheet(course.id, course.sourceLocale, snapshot.targetLocale, course.title);
      await this.translateLessons(course.id, course.sourceLocale, snapshot.targetLocale);

      job.complete();
      await this.jobRepository.save(job);
    } catch (error) {
      await this.refundAndFail(job, error);
    }
  }

  private async translateCourseSheet(
    courseId: string,
    sourceLocale: string,
    targetLocale: string,
    title: string,
  ): Promise<void> {
    const translatedTitle = await this.translationProvider.translate({
      sourceLocale,
      targetLocale,
      content: title,
    });

    await this.coursesFacade.upsertCourseLocale({
      courseId,
      locale: targetLocale,
      title: translatedTitle,
      subtitle: null,
      description: null,
      origin: "AI",
    });
  }

  private async translateLessons(courseId: string, sourceLocale: string, targetLocale: string): Promise<void> {
    const modules = await this.courseContentFacade.listModules(courseId);

    for (const courseModule of modules) {
      const lessons = await this.courseContentFacade.listLessons(courseModule.id);

      for (const lesson of lessons) {
        const [translatedTitle, translatedContent] = await Promise.all([
          this.translationProvider.translate({ sourceLocale, targetLocale, content: lesson.title }),
          lesson.contentHtml
            ? this.translationProvider.translate({
                sourceLocale,
                targetLocale,
                content: lesson.contentHtml,
              })
            : Promise.resolve(null),
        ]);

        await this.courseContentFacade.upsertLessonLocale({
          lessonId: lesson.id,
          locale: targetLocale,
          title: translatedTitle,
          contentHtml: translatedContent,
          origin: "AI",
        });
      }
    }
  }

  private async refundAndFail(job: TranslationJob, error: unknown): Promise<void> {
    const snapshot = job.toSnapshot();
    const message = error instanceof Error ? error.message : "Erreur inconnue du fournisseur de traduction.";
    this.logger.error(`Échec de la traduction ${job.id}: ${message}`);

    if (snapshot.debitedCredits) {
      const wallet = await this.walletRepository.findByTenantId(snapshot.tenantId);
      if (wallet) {
        wallet.credit(snapshot.debitedCredits);
        await this.walletRepository.save(wallet);
        await this.walletRepository.recordLedgerEntry({
          walletId: wallet.id,
          type: CreditLedgerType.REFUND,
          amount: snapshot.debitedCredits,
          translationJobId: job.id,
          note: "Remboursement suite à l'échec de la traduction",
        });
      }
    }

    job.fail(message);
    await this.jobRepository.save(job);
  }
}
