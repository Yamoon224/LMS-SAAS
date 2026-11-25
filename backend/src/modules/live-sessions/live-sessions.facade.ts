import { Injectable } from "@nestjs/common";

import { IsLiveAttendanceSatisfiedUseCase } from "./application/is-live-attendance-satisfied.use-case";
import { ListLiveSessionsUseCase } from "./application/list-live-sessions.use-case";
import type { LiveSession } from "./domain/live-session.entity";

/**
 * Seule API publique du module live-sessions. Utilisée par enrollments pour
 * résoudre RG-08(b) ("les présences live obligatoires sont enregistrées")
 * dans CheckModuleCompletionUseCase.
 */
@Injectable()
export class LiveSessionsFacade {
  constructor(
    private readonly isLiveAttendanceSatisfiedUseCase: IsLiveAttendanceSatisfiedUseCase,
    private readonly listLiveSessionsUseCase: ListLiveSessionsUseCase,
  ) {}

  async isAttendanceSatisfied(userId: string, moduleId: string): Promise<boolean> {
    return this.isLiveAttendanceSatisfiedUseCase.execute(userId, moduleId);
  }

  /** PUB-05 / PUB-03 : prochaines sessions (planifiées ou en cours) des formations indiquées, triées par début. */
  async listUpcomingForCourses(courseIds: string[], from: Date, limit: number): Promise<LiveSession[]> {
    return this.listLiveSessionsUseCase.listUpcomingForCourses(courseIds, from, limit);
  }
}
