import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { Enrollment } from "../domain/enrollment.entity";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { GetLearnerDashboardUseCase } from "./get-learner-dashboard.use-case";
import type { ListEnrollmentsUseCase } from "./list-enrollments.use-case";

const now = new Date("2026-11-18T12:00:00Z");

const enrollment = (id: string, courseId: string, status: EnrollmentStatus, expiresAt: Date | null = null) =>
  Enrollment.fromPersistence({
    id, userId: "u1", courseId, status, pricePaid: 0, currency: "XOF", locale: "fr",
    startedAt: null, expiresAt, completedAt: status === EnrollmentStatus.COMPLETED ? now : null,
  });

const lesson = (id: string, done: boolean) => ({
  id,
  isCompletedBy: () => done,
});

function build(enrollments: Enrollment[]) {
  const listEnrollments = { listForUser: jest.fn().mockResolvedValue(enrollments) } as unknown as ListEnrollmentsUseCase;
  const coursesFacade = {
    // c-other n'est pas dans le tenant : jamais renvoyé par findManyInTenant.
    findManyInTenant: jest.fn().mockImplementation(async (ids: string[]) =>
      ids.filter((id) => id !== "c-other").map((id) => ({ id, title: `Titre ${id}`, coverImageUrl: null })),
    ),
  } as unknown as CoursesFacade;
  const content = {
    listModules: jest.fn().mockResolvedValue([{ id: "m1" }]),
    listLessons: jest.fn().mockResolvedValue([lesson("l1", true), lesson("l2", false), lesson("l3", false), lesson("l4", false)]),
  } as unknown as CourseContentFacade;
  const live = {
    listUpcomingForCourses: jest.fn().mockResolvedValue([
      { id: "s2", courseId: "c2", title: "Live 2", startAt: new Date("2026-12-02T10:00:00Z"), durationMinutes: 30, status: "SCHEDULED", meetLink: "https://m/2" },
      { id: "s1", courseId: "c1", title: "Live 1", startAt: new Date("2026-12-01T10:00:00Z"), durationMinutes: 60, status: "SCHEDULED", meetLink: null },
    ]),
  } as unknown as LiveSessionsFacade;
  const progress = {
    listByEnrollment: jest.fn().mockResolvedValue([{ lessonId: "l1", opened: true, watchedPercent: 100 }]),
  } as unknown as ProgressRepositoryPort;
  return { live, useCase: new GetLearnerDashboardUseCase(listEnrollments, coursesFacade, content, live, progress) };
}

describe("GetLearnerDashboardUseCase", () => {
  it("sépare en cours (avec %) et terminées, et agrège les sessions triées", async () => {
    const { live, useCase } = build([
      enrollment("e1", "c1", EnrollmentStatus.ACTIVE),
      enrollment("e2", "c2", EnrollmentStatus.COMPLETED),
      enrollment("e3", "c3", EnrollmentStatus.SUSPENDED),
      enrollment("e4", "c4", EnrollmentStatus.PENDING_PAYMENT),
    ]);
    const result = await useCase.execute("u1", "t1", now);

    expect(result.inProgress).toEqual([
      { enrollmentId: "e1", courseId: "c1", courseTitle: "Titre c1", courseCoverImageUrl: null, progressPercent: 25, expiresAt: null },
    ]);
    expect(result.completed.map((c) => c.enrollmentId)).toEqual(["e2"]);
    expect(result.upcomingSessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(result.upcomingSessions[0]?.enrollmentId).toBe("e1");
    // seules les formations à accès actif sont interrogées pour les sessions (ni suspendue ni en attente)
    expect((live.listUpcomingForCourses as jest.Mock).mock.calls[0]?.[0]).toEqual(["c1", "c2"]);
  });

  it("ignore une inscription dont la formation est hors tenant et une inscription expirée", async () => {
    const { useCase } = build([
      enrollment("e1", "c-other", EnrollmentStatus.ACTIVE),
      enrollment("e2", "c2", EnrollmentStatus.ACTIVE, new Date("2026-01-01T00:00:00Z")),
    ]);
    const result = await useCase.execute("u1", "t1", now);
    expect(result.inProgress).toEqual([]);
    expect(result.completed).toEqual([]);
    expect(result.upcomingSessions).toEqual([]);
  });
});
