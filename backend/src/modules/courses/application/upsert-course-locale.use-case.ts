import { Inject, Injectable } from "@nestjs/common";

import {
  COURSE_LOCALE_REPOSITORY,
  type CourseLocaleRepositoryPort,
  type UpsertCourseLocaleData,
} from "../domain/course-locale.repository.port";

/** ENT-46: enregistre la fiche formation traduite (origine IA ou manuelle), toujours en DRAFT. */
@Injectable()
export class UpsertCourseLocaleUseCase {
  constructor(
    @Inject(COURSE_LOCALE_REPOSITORY) private readonly courseLocaleRepository: CourseLocaleRepositoryPort,
  ) {}

  async execute(data: UpsertCourseLocaleData): Promise<void> {
    await this.courseLocaleRepository.upsert(data);
  }
}
