
import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { EnrollmentCompletedEvent } from "../enrollments.events";

import { CheckModuleCompletionUseCase } from "./check-module-completion.use-case";

/**
 * Dupliqué depuis courses/domain/course-type.ts plutôt qu'importé — un
 * module ne doit jamais dépendre des fichiers internes (domain/...) d'un
 * autre module (section 13.2). CoursesFacade.findById() renvoie un Course
 * dont le champ `type` prend l'une de ces deux valeurs.
 */
const NON_CERTIFYING_COURSE_TYPE = "NON_CERTIFYING";

/**
 * RG-21: "une formation non certifiante n'a ni examen ni certificat ; elle
 * est terminée lorsque tous les modules sont validés (les quiz y sont
 * optionnels)." Appelé après chaque mise à jour de progression (vue de
 * leçon, soumission de quiz) pour une formation non certifiante — les
 * formations certifiantes passent par CompleteEnrollmentOnExamPassedListener.
 */
@Injectable()
export class CompleteNonCertifyingCourseUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly checkModuleCompletionUseCase: CheckModuleCompletionUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(enrollmentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) return;

    const course = await this.coursesFacade.findById(enrollment.courseId);
    if (course.type !== NON_CERTIFYING_COURSE_TYPE) return;
    if (enrollment.status !== EnrollmentStatus.ACTIVE) return;

    const modules = await this.courseContentFacade.listModules(course.id);
    if (modules.length === 0) return;

    for (const courseModule of modules) {
      const validated = await this.checkModuleCompletionUseCase.execute(enrollmentId, courseModule.id);
      if (!validated) return;
    }

    enrollment.complete();
    await this.enrollmentRepository.save(enrollment);

    this.eventEmitter.emit(
      "enrollment.completed",
      new EnrollmentCompletedEvent(enrollment.id, enrollment.userId, enrollment.courseId),
    );
  }
}
