import { CoursesFacade } from "@modules/courses/courses.facade";
import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/**
 * Anti-IDOR côté apprenant: une session live (lien Meet, replay, inscription,
 * présence) n'est accessible qu'à un apprenant du tenant dont l'inscription à
 * la formation de la session donne actuellement accès au contenu. Tout autre
 * cas renvoie le même 404 qu'une ressource inexistante (jamais 403).
 */
@Injectable()
export class AuthorizeLearnerLiveSessionUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly enrollmentsFacade: EnrollmentsFacade,
  ) {}

  /** Calendrier d'une formation: formation du tenant ET apprenant ayant accès au contenu. */
  async assertCourseAccess(courseId: string, userId: string, tenantId: string): Promise<void> {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    if (!(await this.enrollmentsFacade.hasContentAccess(userId, courseId))) {
      throw new NotFoundDomainError(`Formation introuvable: ${courseId}`);
    }
  }

  /** Action sur une session précise (inscription, présence). */
  async assertSessionAccess(liveSessionId: string, userId: string, tenantId: string): Promise<void> {
    const session = await this.liveSessionRepository.findById(liveSessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }
    if (!(await this.enrollmentsFacade.hasContentAccess(userId, session.courseId))) {
      throw new NotFoundDomainError(`Session live introuvable: ${liveSessionId}`);
    }
  }
}
