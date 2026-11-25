import type { EventEmitter2 } from "@nestjs/event-emitter";

import { CourseCreatedEvent } from "../courses.events";
import { CourseType, ProgressionMode } from "../domain/course-type";
import type { Course } from "../domain/course.entity";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { CreateCourseUseCase, type CreateCourseInput } from "./create-course.use-case";

const input: CreateCourseInput = {
  tenantId: "tenant-1",
  title: "Titre",
  type: CourseType.CERTIFYING,
  progressionMode: ProgressionMode.SEQUENTIAL,
  sourceLocale: "fr",
  price: 1000,
  currency: "XOF",
  instructorIds: ["u1"],
};

describe("CreateCourseUseCase (ENT-15)", () => {
  it("persists the course, emits course.created and returns the created course", async () => {
    const created = { id: "course-1" } as unknown as Course;
    const repository = { create: jest.fn().mockResolvedValue(created) };
    const emitter = { emit: jest.fn() };
    const useCase = new CreateCourseUseCase(
      repository as unknown as CourseRepositoryPort,
      emitter as unknown as EventEmitter2,
    );

    const result = await useCase.execute(input);

    expect(result).toBe(created);
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(emitter.emit).toHaveBeenCalledWith("course.created", new CourseCreatedEvent("course-1", "tenant-1"));
  });

  it("does not emit when persistence fails", async () => {
    const repository = { create: jest.fn().mockRejectedValue(new Error("db")) };
    const emitter = { emit: jest.fn() };
    const useCase = new CreateCourseUseCase(
      repository as unknown as CourseRepositoryPort,
      emitter as unknown as EventEmitter2,
    );

    await expect(useCase.execute(input)).rejects.toThrow("db");
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
