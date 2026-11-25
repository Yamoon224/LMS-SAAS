import { NotFoundDomainError } from "@shared/errors";

import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { GetCourseUseCase } from "./get-course.use-case";

describe("GetCourseUseCase.executeInTenant", () => {
  it("looks the course up within the tenant and returns it", async () => {
    const course = { id: "course-1" };
    const repository = { findByIdInTenant: jest.fn().mockResolvedValue(course) } as unknown as CourseRepositoryPort;
    await expect(new GetCourseUseCase(repository).executeInTenant("course-1", "tenant-1")).resolves.toBe(course);
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
  });

  it("raises the same NotFound for a course of another tenant", async () => {
    const repository = { findByIdInTenant: jest.fn().mockResolvedValue(null) } as unknown as CourseRepositoryPort;
    await expect(new GetCourseUseCase(repository).executeInTenant("course-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});

describe("GetCourseUseCase.executePublished (catalogue public)", () => {
  function build(course: unknown) {
    const repository = { findByIdInTenant: jest.fn().mockResolvedValue(course) } as unknown as CourseRepositoryPort;
    return new GetCourseUseCase(repository);
  }

  it("returns a published course of the tenant", async () => {
    const course = { id: "course-1", isPurchasable: () => true };
    await expect(build(course).executePublished("course-1", "tenant-1")).resolves.toBe(course);
  });

  it("raises NotFound for a DRAFT / HIDDEN / ARCHIVED course (not purchasable)", async () => {
    const course = { id: "course-1", isPurchasable: () => false };
    await expect(build(course).executePublished("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound for a course of another tenant", async () => {
    await expect(build(null).executePublished("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });
});
