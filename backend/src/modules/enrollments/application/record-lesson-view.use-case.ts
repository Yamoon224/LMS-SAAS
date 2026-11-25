import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { ENROLLMENT_REPOSITORY } from "../domain/enrollment.repository.port";
import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

export class NoContentAccessError extends DomainError {
  readonly code = "ACCES_CONTENU_REFUSE";
}

export class LessonViewedEvent {
  constructor(public readonly enrollmentId: string, public readonly lessonId: string) {}
}

/** PUB-09: reprise de lecture, suivi de consultation d'une leçon (ENT-25, critère de complétion). */
@Injectable()
export class RecordLessonViewUseCase {
  constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepository: EnrollmentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(enrollmentId: string, lessonId: string, watchedPercent?: number): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }

    if (!enrollment.hasContentAccess()) {
      throw new NoContentAccessError(
        "L'accès au contenu de cette formation n'est plus disponible (RG-17).",
      );
    }

    let progress = await this.progressRepository.findByEnrollmentAndLesson(enrollmentId, lessonId);
    progress ??= await this.progressRepository.create(enrollmentId, lessonId);

    progress.recordView(watchedPercent);
    await this.progressRepository.save(progress);

    this.eventEmitter.emit("lesson.viewed", new LessonViewedEvent(enrollmentId, lessonId));
  }
}
