import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { CourseCreatedEvent } from "../courses.events";
import type { CourseType, ProgressionMode } from "../domain/course-type";
import type { Course } from "../domain/course.entity";
import { COURSE_REPOSITORY } from "../domain/course.repository.port";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

export interface CreateCourseInput {
  tenantId: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: CourseType;
  progressionMode: ProgressionMode;
  sourceLocale: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  accessDurationDays?: number;
  category?: string;
  level?: string;
  estimatedDurationMinutes?: number;
  coverImageUrl?: string;
  instructorIds: string[];
}

/** ENT-15: fiche formation créée en brouillon (section 8.1). */
@Injectable()
export class CreateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepository: CourseRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateCourseInput): Promise<Course> {
    const course = await this.courseRepository.create(input);

    this.eventEmitter.emit("course.created", new CourseCreatedEvent(course.id, input.tenantId));

    return course;
  }
}
