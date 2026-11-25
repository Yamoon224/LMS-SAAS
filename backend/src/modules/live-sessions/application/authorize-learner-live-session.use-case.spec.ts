import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { AuthorizeLearnerLiveSessionUseCase } from "./authorize-learner-live-session.use-case";

interface Options {
  session?: { tenantId: string; courseId: string } | null;
  hasAccess?: boolean;
  courseInTenant?: boolean;
}

function build(options: Options) {
  const repository = {
    findById: jest.fn().mockResolvedValue(options.session ?? null),
  } as unknown as LiveSessionRepositoryPort;
  const coursesFacade = {
    assertCourseInTenant: jest.fn().mockImplementation(async () => {
      if (options.courseInTenant === false) throw new NotFoundDomainError("Formation introuvable");
    }),
  } as unknown as CoursesFacade;
  const enrollmentsFacade = {
    hasContentAccess: jest.fn().mockResolvedValue(options.hasAccess ?? true),
  } as unknown as EnrollmentsFacade;
  return {
    enrollmentsFacade,
    useCase: new AuthorizeLearnerLiveSessionUseCase(repository, coursesFacade, enrollmentsFacade),
  };
}

describe("AuthorizeLearnerLiveSessionUseCase.assertSessionAccess", () => {
  const session = { tenantId: "tenant-1", courseId: "course-1" };

  it("accepts an enrolled learner on a session of the tenant", async () => {
    const { enrollmentsFacade, useCase } = build({ session });
    await expect(useCase.assertSessionAccess("ls-1", "user-1", "tenant-1")).resolves.toBeUndefined();
    expect(enrollmentsFacade.hasContentAccess).toHaveBeenCalledWith("user-1", "course-1");
  });

  it("raises NotFound for an unknown session", async () => {
    const { useCase } = build({});
    await expect(useCase.assertSessionAccess("ls-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for a session of another tenant", async () => {
    const { useCase } = build({ session: { tenantId: "tenant-B", courseId: "course-1" } });
    await expect(useCase.assertSessionAccess("ls-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for a learner without active access to the course", async () => {
    const { useCase } = build({ session, hasAccess: false });
    await expect(useCase.assertSessionAccess("ls-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("AuthorizeLearnerLiveSessionUseCase.assertCourseAccess", () => {
  it("accepts an enrolled learner on a course of the tenant", async () => {
    const { useCase } = build({});
    await expect(useCase.assertCourseAccess("course-1", "user-1", "tenant-1")).resolves.toBeUndefined();
  });

  it("raises NotFound for a course of another tenant", async () => {
    const { useCase } = build({ courseInTenant: false });
    await expect(useCase.assertCourseAccess("course-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for a learner not enrolled in the course", async () => {
    const { useCase } = build({ hasAccess: false });
    await expect(useCase.assertCourseAccess("course-1", "user-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});
