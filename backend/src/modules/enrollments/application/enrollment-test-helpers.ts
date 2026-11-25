import { EnrollmentStatus } from "../domain/enrollment-status";
import { Enrollment, type EnrollmentProps } from "../domain/enrollment.entity";
import { Progress, type ProgressProps } from "../domain/progress.entity";
import { ProgressState } from "../domain/progress-state";

export function buildEnrollment(overrides: Partial<EnrollmentProps> = {}): Enrollment {
  return Enrollment.fromPersistence({
    id: "enr-1",
    userId: "user-1",
    courseId: "course-1",
    status: EnrollmentStatus.ACTIVE,
    pricePaid: 100,
    currency: "XOF",
    locale: "fr",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: null,
    completedAt: null,
    ...overrides,
  });
}

export function buildProgress(overrides: Partial<ProgressProps> = {}): Progress {
  return Progress.fromPersistence({
    id: "p-1",
    enrollmentId: "enr-1",
    lessonId: "lesson-1",
    state: ProgressState.NOT_STARTED,
    watchedPercent: null,
    opened: false,
    startedAt: null,
    completedAt: null,
    ...overrides,
  });
}
