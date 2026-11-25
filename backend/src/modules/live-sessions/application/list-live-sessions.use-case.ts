import { Inject, Injectable } from "@nestjs/common";

import type { LiveSession } from "../domain/live-session.entity";
import { LIVE_SESSION_REPOSITORY } from "../domain/live-session.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

/** ENT-52 à ENT-58 / PUB: calendrier des sessions live d'une formation ou d'un module. */
@Injectable()
export class ListLiveSessionsUseCase {
  constructor(
    @Inject(LIVE_SESSION_REPOSITORY) private readonly liveSessionRepository: LiveSessionRepositoryPort,
  ) {}

  async listForCourse(courseId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository.listByCourse(courseId);
  }

  async listUpcomingForCourses(courseIds: string[], from: Date, limit: number): Promise<LiveSession[]> {
    return this.liveSessionRepository.listUpcomingByCourses(courseIds, from, limit);
  }

  async listForModule(moduleId: string): Promise<LiveSession[]> {
    return this.liveSessionRepository.listByModule(moduleId);
  }
}
