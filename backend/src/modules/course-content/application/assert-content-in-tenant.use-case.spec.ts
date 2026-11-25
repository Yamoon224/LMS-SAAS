import type { CoursesFacade } from "@modules/courses/courses.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";

import { AssertContentInTenantUseCase } from "./assert-content-in-tenant.use-case";

function build(options: { moduleCourseId?: string; lessonModuleId?: string; courseInTenant?: boolean }) {
  const moduleRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(options.moduleCourseId ? { id: "module-1", courseId: options.moduleCourseId } : null),
  } as unknown as CourseModuleRepositoryPort;
  const lessonRepository = {
    findById: jest
      .fn()
      .mockResolvedValue(options.lessonModuleId ? { id: "lesson-1", moduleId: options.lessonModuleId } : null),
  } as unknown as LessonRepositoryPort;
  const coursesFacade = {
    assertCourseInTenant: jest.fn().mockImplementation(async () => {
      if (options.courseInTenant === false) {
        throw new NotFoundDomainError("Formation introuvable");
      }
    }),
  } as unknown as CoursesFacade;
  return {
    useCase: new AssertContentInTenantUseCase(moduleRepository, lessonRepository, coursesFacade),
    coursesFacade,
  };
}

describe("AssertContentInTenantUseCase", () => {
  it("returns the course id of a module whose course belongs to the tenant", async () => {
    const { useCase, coursesFacade } = build({ moduleCourseId: "course-1" });
    await expect(useCase.assertModule("module-1", "tenant-1")).resolves.toBe("course-1");
    expect(coursesFacade.assertCourseInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
  });

  it("raises NotFound for an unknown module", async () => {
    const { useCase } = build({});
    await expect(useCase.assertModule("module-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound when the module's course belongs to another tenant", async () => {
    const { useCase } = build({ moduleCourseId: "course-1", courseInTenant: false });
    await expect(useCase.assertModule("module-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
  });

  it("raises NotFound when the module is not part of the course given in the URL", async () => {
    const { useCase, coursesFacade } = build({ moduleCourseId: "course-1" });
    await expect(useCase.assertModule("module-1", "tenant-1", "course-OTHER")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(coursesFacade.assertCourseInTenant).not.toHaveBeenCalled();
  });

  it("raises NotFound for a lesson that is not in the module of the URL", async () => {
    const { useCase } = build({ moduleCourseId: "course-1", lessonModuleId: "module-OTHER" });
    await expect(useCase.assertLesson("lesson-1", "module-1", "tenant-1")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("accepts a lesson of a module of the tenant", async () => {
    const { useCase } = build({ moduleCourseId: "course-1", lessonModuleId: "module-1" });
    await expect(useCase.assertLesson("lesson-1", "module-1", "tenant-1")).resolves.toBeUndefined();
  });
});
