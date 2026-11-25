import { NotFoundDomainError } from "@shared/errors";

import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { CourseNotEditableError, UpdateCourseUseCase } from "./update-course.use-case";

function build(found: unknown) {
  const repository = {
    findByIdInTenant: jest.fn().mockResolvedValue(found),
    update: jest.fn().mockResolvedValue(undefined),
  };
  return { repository, useCase: new UpdateCourseUseCase(repository as unknown as CourseRepositoryPort) };
}

describe("UpdateCourseUseCase (ENT-21)", () => {
  it("updates an editable course within the tenant", async () => {
    const { useCase, repository } = build({ isEditable: () => true });

    await useCase.execute("course-1", "tenant-1", { title: "Nouveau" });

    expect(repository.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
    expect(repository.update).toHaveBeenCalledWith("course-1", { title: "Nouveau" });
  });

  it("raises NotFound for an unknown course or one from another tenant", async () => {
    const { useCase, repository } = build(null);

    await expect(useCase.execute("course-1", "tenant-1", { title: "x" })).rejects.toThrow(NotFoundDomainError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("locks an archived course", async () => {
    const { useCase, repository } = build({ isEditable: () => false });

    await expect(useCase.execute("course-1", "tenant-1", { title: "x" })).rejects.toThrow(CourseNotEditableError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
