import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { Inject, Injectable } from "@nestjs/common";

import { EnrollmentStatus } from "../domain/enrollment-status";
import type { Enrollment } from "../domain/enrollment.entity";
import { computeProgressPercent, upcomingSessionsSorted } from "../domain/learner-dashboard";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { isLessonCompleted } from "./get-learner-course-content.use-case";
import { ListEnrollmentsUseCase } from "./list-enrollments.use-case";

const UPCOMING_SESSIONS_LIMIT = 10;

export interface DashboardCourseItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string | null;
  courseCoverImageUrl: string | null;
}

export interface DashboardInProgress extends DashboardCourseItem {
  progressPercent: number;
  expiresAt: Date | null;
}

export interface DashboardCompleted extends DashboardCourseItem {
  completedAt: Date | null;
}

export interface DashboardSession {
  id: string;
  title: string;
  startAt: Date;
  durationMinutes: number;
  status: string;
  meetLink: string | null;
  enrollmentId: string;
  courseId: string;
  courseTitle: string | null;
}

export interface LearnerDashboard {
  inProgress: DashboardInProgress[];
  completed: DashboardCompleted[];
  upcomingSessions: DashboardSession[];
}

/**
 * PUB-05 : tableau de bord de l'apprenant — formations en cours (avec % de progression), terminées, et prochaines
 * sessions live de TOUTES ses inscriptions donnant accès au contenu. Les certificats récents et les notifications non
 * lues sont lus par l'écran auprès de leurs propres routes (modules certificates et notifications).
 */
@Injectable()
export class GetLearnerDashboardUseCase {
  constructor(
    private readonly listEnrollmentsUseCase: ListEnrollmentsUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly liveSessionsFacade: LiveSessionsFacade,
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
  ) {}

  async execute(userId: string, tenantId: string, now: Date = new Date()): Promise<LearnerDashboard> {
    const enrollments = await this.listEnrollmentsUseCase.listForUser(userId);
    const courses = await this.coursesFacade.findManyInTenant(
      enrollments.map((enrollment) => enrollment.courseId),
      tenantId,
    );
    const courseById = new Map(courses.map((course) => [course.id, course]));
    // Une inscription dont la formation n'est pas (ou plus) dans ce tenant n'apparaît pas.
    const visible = enrollments.filter((enrollment) => courseById.has(enrollment.courseId));

    const item = (enrollment: Enrollment): DashboardCourseItem => ({
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseTitle: courseById.get(enrollment.courseId)?.title ?? null,
      courseCoverImageUrl: courseById.get(enrollment.courseId)?.coverImageUrl ?? null,
    });

    const active = visible.filter(
      (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE && enrollment.hasContentAccess(now),
    );
    const inProgress: DashboardInProgress[] = [];
    for (const enrollment of active) {
      inProgress.push({
        ...item(enrollment),
        progressPercent: await this.progressPercent(enrollment),
        expiresAt: enrollment.expiresAt,
      });
    }

    const completed: DashboardCompleted[] = visible
      .filter((enrollment) => enrollment.status === EnrollmentStatus.COMPLETED)
      .map((enrollment) => ({ ...item(enrollment), completedAt: enrollment.completedAt }));

    // Sessions : formations dont le contenu est accessible (en cours ou terminées non expirées).
    const accessible = visible.filter((enrollment) => enrollment.hasContentAccess(now));
    const enrollmentByCourse = new Map(accessible.map((enrollment) => [enrollment.courseId, enrollment]));
    const sessions = await this.liveSessionsFacade.listUpcomingForCourses(
      [...enrollmentByCourse.keys()],
      now,
      UPCOMING_SESSIONS_LIMIT,
    );
    const upcomingSessions = upcomingSessionsSorted(
      sessions.flatMap((session) => {
        const enrollment = enrollmentByCourse.get(session.courseId);
        if (!enrollment) return [];
        return [
          {
            id: session.id,
            title: session.title,
            startAt: session.startAt,
            durationMinutes: session.durationMinutes,
            status: session.status,
            meetLink: session.meetLink,
            enrollmentId: enrollment.id,
            courseId: session.courseId,
            courseTitle: courseById.get(session.courseId)?.title ?? null,
          },
        ];
      }),
      UPCOMING_SESSIONS_LIMIT,
    );

    return { inProgress, completed, upcomingSessions };
  }

  private async progressPercent(enrollment: Enrollment): Promise<number> {
    const progressByLesson = new Map(
      (await this.progressRepository.listByEnrollment(enrollment.id)).map((progress) => [progress.lessonId, progress]),
    );
    let total = 0;
    let done = 0;
    for (const module of await this.courseContentFacade.listModules(enrollment.courseId)) {
      for (const lesson of await this.courseContentFacade.listLessons(module.id)) {
        total += 1;
        if (isLessonCompleted(lesson, progressByLesson.get(lesson.id))) done += 1;
      }
    }
    return computeProgressPercent(done, total);
  }
}
