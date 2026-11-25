import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { CourseDuplicatedEvent } from "../courses.events";
import { CourseStatus } from "../domain/course-status";
import { CourseType, ProgressionMode } from "../domain/course-type";
import { Course } from "../domain/course.entity";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { DuplicateCourseUseCase } from "./duplicate-course.use-case";

const source = Course.fromPersistence({
  id: "course-1",
  tenantId: "tenant-1",
  title: "Compta",
  subtitle: "sub",
  description: "desc",
  type: CourseType.NON_CERTIFYING,
  status: CourseStatus.PUBLISHED,
  progressionMode: ProgressionMode.SEQUENTIAL,
  sourceLocale: "fr",
  price: 5000,
  compareAtPrice: null,
  currency: "XOF",
  accessDurationDays: null,
  category: null,
  level: null,
  estimatedDurationMinutes: null,
  coverImageUrl: null,
  instructorIds: ["u1", "u2"],
  publishedAt: new Date(),
  certificateTemplateId: null,
});

function build(found: Course | null) {
  const copy = { id: "course-2" } as unknown as Course;
  const repository = {
    findByIdInTenant: jest.fn().mockResolvedValue(found),
    create: jest.fn().mockResolvedValue(copy),
  };
  const emitter = { emit: jest.fn() };
  return {
    copy,
    repository,
    emitter,
    useCase: new DuplicateCourseUseCase(
      repository as unknown as CourseRepositoryPort,
      emitter as unknown as EventEmitter2,
    ),
  };
}

describe("DuplicateCourseUseCase (ENT-20)", () => {
  it("creates a copy of the course sheet and emits course.duplicated", async () => {
    const { useCase, repository, emitter, copy } = build(source);

    const result = await useCase.execute("course-1", "tenant-1");

    expect(result).toBe(copy);
    expect(repository.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      title: "Compta (copie)",
      type: CourseType.NON_CERTIFYING,
      progressionMode: ProgressionMode.SEQUENTIAL,
      sourceLocale: "fr",
      price: 5000,
      currency: "XOF",
      instructorIds: ["u1", "u2"],
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      "course.duplicated",
      new CourseDuplicatedEvent("course-1", "course-2", "tenant-1"),
    );
  });

  it("copies the instructor list instead of sharing the source array", async () => {
    const { useCase, repository } = build(source);

    await useCase.execute("course-1", "tenant-1");

    const data = repository.create.mock.calls[0][0] as { instructorIds: string[] };
    expect(data.instructorIds).not.toBe(source.instructorIds);
  });

  it("raises NotFound for an unknown course or one from another tenant", async () => {
    const { useCase, repository, emitter } = build(null);

    await expect(useCase.execute("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
    expect(repository.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
