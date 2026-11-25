import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { CourseDuplicatedEvent } from "../courses.events";
import type { Course } from "../domain/course.entity";
import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

/**
 * ENT-20: "dupliquer une formation (structure, contenus, quiz) pour en créer
 * une variante." Ce use case ne duplique que la fiche formation (titre,
 * prix, type...), toujours en Brouillon — la copie de la structure
 * (modules/leçons/quiz) est déléguée aux modules Modules & Content et
 * Assessments via l'événement émis, qui en sont responsables et pas Courses.
 */
@Injectable()
export class DuplicateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(courseId: string, tenantId: string): Promise<Course> {
    const source = await this.courseRepository.findByIdInTenant(courseId, tenantId);
    if (!source) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }

    const copy = await this.courseRepository.create({
      tenantId,
      title: `${source.title} (copie)`,
      type: source.type,
      progressionMode: source.progressionMode,
      sourceLocale: source.sourceLocale,
      price: source.price,
      currency: source.currency,
      instructorIds: [...source.instructorIds],
    });

    this.eventEmitter.emit(
      "course.duplicated",
      new CourseDuplicatedEvent(source.id, copy.id, tenantId),
    );

    return copy;
  }
}
