import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { EnrollmentRepositoryPort } from "../domain/enrollment.repository.port";

import { EnrollInCourseUseCase } from "./enroll-in-course.use-case";

const input = { userId: "user-1", tenantId: "tenant-1", courseId: "course-1", locale: "fr", isOfflinePayment: false };

function build(courseInTenant: boolean) {
  const repository = {
    findByUserAndCourse: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: "enr-1", activate: jest.fn() }),
    save: jest.fn(),
  } as unknown as EnrollmentRepositoryPort;
  const coursesFacade = {
    findByIdInTenant: jest.fn().mockImplementation(async () => {
      if (!courseInTenant) throw new NotFoundDomainError("Formation introuvable");
      return { price: 10, currency: "XOF", isPurchasable: () => true, accessDurationDays: null };
    }),
  } as unknown as CoursesFacade;
  const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
  return { repository, coursesFacade, useCase: new EnrollInCourseUseCase(repository, coursesFacade, emitter) };
}

describe("EnrollInCourseUseCase - tenant ownership of the course", () => {
  it("enrolls in a course of the caller's tenant", async () => {
    const { repository, coursesFacade, useCase } = build(true);
    await useCase.execute(input);
    expect(coursesFacade.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
    expect(repository.create).toHaveBeenCalled();
  });

  it("raises NotFound and creates nothing for a course of another tenant", async () => {
    const { repository, useCase } = build(false);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundDomainError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
