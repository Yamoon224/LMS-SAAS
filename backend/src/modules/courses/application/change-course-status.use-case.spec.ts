import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { CourseArchivedEvent, CoursePublishedEvent } from "../courses.events";
import { CourseStatus } from "../domain/course-status";
import { CourseType, ProgressionMode } from "../domain/course-type";
import { Course } from "../domain/course.entity";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { ChangeCourseStatusUseCase } from "./change-course-status.use-case";

function course(status: CourseStatus): Course {
  return Course.fromPersistence({
    id: "course-1",
    tenantId: "tenant-1",
    title: "Titre",
    subtitle: null,
    description: null,
    type: CourseType.CERTIFYING,
    status,
    progressionMode: ProgressionMode.FREE,
    sourceLocale: "fr",
    price: 0,
    compareAtPrice: null,
    currency: "XOF",
    accessDurationDays: null,
    category: null,
    level: null,
    estimatedDurationMinutes: null,
    coverImageUrl: null,
    instructorIds: [],
    publishedAt: null,
    certificateTemplateId: null,
  });
}

function build(found: Course | null) {
  const repository = {
    findByIdInTenant: jest.fn().mockResolvedValue(found),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  const emitter = { emit: jest.fn() };
  return {
    repository,
    emitter,
    useCase: new ChangeCourseStatusUseCase(
      repository as unknown as CourseRepositoryPort,
      emitter as unknown as EventEmitter2,
    ),
  };
}

describe("ChangeCourseStatusUseCase", () => {
  describe("publish", () => {
    it("publishes a draft course, persists the status and emits course.published", async () => {
      const { useCase, repository, emitter } = build(course(CourseStatus.DRAFT));

      await useCase.publish("course-1", "tenant-1");

      expect(repository.findByIdInTenant).toHaveBeenCalledWith("course-1", "tenant-1");
      expect(repository.updateStatus).toHaveBeenCalledWith("course-1", CourseStatus.PUBLISHED);
      expect(emitter.emit).toHaveBeenCalledWith("course.published", new CoursePublishedEvent("course-1", "tenant-1"));
    });

    it("raises NotFound for an unknown course or one from another tenant", async () => {
      const { useCase, repository, emitter } = build(null);

      await expect(useCase.publish("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("rejects publishing an archived course without side effects", async () => {
      const { useCase, repository, emitter } = build(course(CourseStatus.ARCHIVED));

      await expect(useCase.publish("course-1", "tenant-1")).rejects.toThrow(InvalidStateTransitionError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("hide", () => {
    it("hides a published course and persists the status without event", async () => {
      const { useCase, repository, emitter } = build(course(CourseStatus.PUBLISHED));

      await useCase.hide("course-1", "tenant-1");

      expect(repository.updateStatus).toHaveBeenCalledWith("course-1", CourseStatus.HIDDEN);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("raises NotFound for an unknown course", async () => {
      const { useCase, repository } = build(null);

      await expect(useCase.hide("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it("rejects hiding a draft course", async () => {
      const { useCase, repository } = build(course(CourseStatus.DRAFT));

      await expect(useCase.hide("course-1", "tenant-1")).rejects.toThrow(InvalidStateTransitionError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("archive", () => {
    it("archives a published course, persists the status and emits course.archived", async () => {
      const { useCase, repository, emitter } = build(course(CourseStatus.PUBLISHED));

      await useCase.archive("course-1", "tenant-1");

      expect(repository.updateStatus).toHaveBeenCalledWith("course-1", CourseStatus.ARCHIVED);
      expect(emitter.emit).toHaveBeenCalledWith("course.archived", new CourseArchivedEvent("course-1", "tenant-1"));
    });

    it("raises NotFound for an unknown course", async () => {
      const { useCase, emitter } = build(null);

      await expect(useCase.archive("course-1", "tenant-1")).rejects.toThrow(NotFoundDomainError);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("rejects archiving an already archived course", async () => {
      const { useCase, repository, emitter } = build(course(CourseStatus.ARCHIVED));

      await expect(useCase.archive("course-1", "tenant-1")).rejects.toThrow(InvalidStateTransitionError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });
});
