import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { COURSE_MODULE_REPOSITORY } from "../domain/course-module.repository.port";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";
import { LessonContent } from "../domain/lesson-content.vo";
import type { Lesson } from "../domain/lesson.entity";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";
import type { CompletionCriteria, ResourceType } from "../domain/resource-type";

export interface CreateLessonInput {
  moduleId: string;
  title: string;
  contentHtml?: string;
  resourceType: ResourceType;
  storageUrl?: string;
  isMandatory: boolean;
  completionCriteria?: CompletionCriteria;
  downloadAllowed: boolean;
}

/** ENT-23/ENT-24: ajouter une leçon (contenu texte CKEditor ou ressource téléversée). */
@Injectable()
export class CreateLessonUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort,
    @Inject(COURSE_MODULE_REPOSITORY) private readonly moduleRepository: CourseModuleRepositoryPort,
  ) {}

  async execute(input: CreateLessonInput): Promise<Lesson> {
    const courseModule = await this.moduleRepository.findById(input.moduleId);
    if (!courseModule) {
      throw new NotFoundDomainError(`Module introuvable: ${input.moduleId}`);
    }

    const sanitizedContent = input.contentHtml ? LessonContent.create(input.contentHtml) : undefined;
    const order = await this.lessonRepository.nextOrder(input.moduleId);

    return this.lessonRepository.create({
      ...input,
      contentHtml: sanitizedContent?.toString(),
      order,
    });
  }
}
