import { Inject, Injectable } from "@nestjs/common";

import type { TranslationJob } from "../domain/translation-job.entity";
import { TRANSLATION_JOB_REPOSITORY } from "../domain/translation-job.repository.port";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";

@Injectable()
export class ListTranslationJobsUseCase {
  constructor(
    @Inject(TRANSLATION_JOB_REPOSITORY) private readonly jobRepository: TranslationJobRepositoryPort,
  ) {}

  /** Les jobs d'une formation d'un autre tenant ne sont jamais retournés: liste filtrée sur le tenant. */
  async listForCourse(courseId: string, tenantId: string): Promise<TranslationJob[]> {
    const jobs = await this.jobRepository.listByCourse(courseId);
    return jobs.filter((job) => job.toSnapshot().tenantId === tenantId);
  }

  async listForTenant(tenantId: string): Promise<TranslationJob[]> {
    return this.jobRepository.listByTenant(tenantId);
  }
}
