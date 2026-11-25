import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { CourseArchivedEvent, CoursePublishedEvent } from "../courses.events";
import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

/** ENT-18: Brouillon → Publiée ↔ Masquée → Archivée (section 8.1). */
@Injectable()
export class ChangeCourseStatusUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(courseId: string, tenantId: string): Promise<void> {
    const course = await this.getCourseOrThrow(courseId, tenantId);
    course.publish();
    await this.courseRepository.updateStatus(courseId, course.status);
    this.eventEmitter.emit("course.published", new CoursePublishedEvent(courseId, tenantId));
  }

  async hide(courseId: string, tenantId: string): Promise<void> {
    const course = await this.getCourseOrThrow(courseId, tenantId);
    course.hide();
    await this.courseRepository.updateStatus(courseId, course.status);
  }

  async archive(courseId: string, tenantId: string): Promise<void> {
    const course = await this.getCourseOrThrow(courseId, tenantId);
    course.archive();
    await this.courseRepository.updateStatus(courseId, course.status);
    this.eventEmitter.emit("course.archived", new CourseArchivedEvent(courseId, tenantId));
  }

  private async getCourseOrThrow(courseId: string, tenantId: string) {
    const course = await this.courseRepository.findByIdInTenant(courseId, tenantId);
    if (!course) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }
    return course;
  }
}
