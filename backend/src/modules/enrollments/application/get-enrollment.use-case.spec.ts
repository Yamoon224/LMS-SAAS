import type { CoursesFacade } from "@modules/courses/courses.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

import { GetEnrollmentUseCase } from "./get-enrollment.use-case";

function build(enrollment: unknown, courseInTenant: boolean) {
  const repository = { findById: jest.fn().mockResolvedValue(enrollment) } as unknown as EnrollmentRepositoryPort;
  const coursesFacade = {
    assertCourseInTenant: jest.fn().mockImplementation(async () => {
      if (!courseInTenant) {
        throw new NotFoundDomainError("Formation introuvable");
      }
    }),
  } as unknown as CoursesFacade;
  return new GetEnrollmentUseCase(repository, coursesFacade);
}

describe("GetEnrollmentUseCase.executeInTenant", () => {
  it("returns the enrollment when its course belongs to the tenant", async () => {
    const enrollment = { id: "enr-1", courseId: "course-1" };
    await expect(build(enrollment, true).executeInTenant("enr-1", "tenant-1")).resolves.toBe(enrollment);
  });

  it("raises NotFound for an unknown enrollment", async () => {
    await expect(build(null, true).executeInTenant("enr-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises the same NotFound (not a 403) when the course belongs to another tenant", async () => {
    const useCase = build({ id: "enr-1", courseId: "course-1" }, false);
    await expect(useCase.executeInTenant("enr-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("GetEnrollmentUseCase.executeOwned (anti-IDOR apprenant)", () => {
  it("returns the enrollment for its owner within the tenant", async () => {
    const enrollment = { id: "enr-1", courseId: "course-1", userId: "user-1" };
    await expect(build(enrollment, true).executeOwned("enr-1", "user-1", "tenant-1")).resolves.toBe(enrollment);
  });

  it("raises NotFound when the enrollment belongs to another learner of the same tenant", async () => {
    const enrollment = { id: "enr-1", courseId: "course-1", userId: "user-2" };
    await expect(build(enrollment, true).executeOwned("enr-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("raises NotFound when the course is in another tenant", async () => {
    const enrollment = { id: "enr-1", courseId: "course-1", userId: "user-1" };
    await expect(build(enrollment, false).executeOwned("enr-1", "user-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});

describe("GetEnrollmentUseCase.hasContentAccess", () => {
  function buildWith(enrollment: unknown) {
    const repository = {
      findByUserAndCourse: jest.fn().mockResolvedValue(enrollment),
    } as unknown as EnrollmentRepositoryPort;
    return new GetEnrollmentUseCase(repository, {} as unknown as CoursesFacade);
  }

  it("is true only for an enrollment currently granting access", async () => {
    await expect(buildWith({ hasContentAccess: () => true }).hasContentAccess("u", "c")).resolves.toBe(true);
    await expect(buildWith({ hasContentAccess: () => false }).hasContentAccess("u", "c")).resolves.toBe(false);
    await expect(buildWith(null).hasContentAccess("u", "c")).resolves.toBe(false);
  });
});
