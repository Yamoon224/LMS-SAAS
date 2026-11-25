import { InvalidStateTransitionError } from "@shared/errors";

import { CourseStatus } from "./course-status";
import { CourseType, ProgressionMode } from "./course-type";
import { Course } from "./course.entity";

function buildCourse(status: CourseStatus): Course {
  return Course.fromPersistence({
    id: "course-1",
    tenantId: "tenant-1",
    title: "Introduction à la comptabilité",
    subtitle: null,
    description: null,
    type: CourseType.CERTIFYING,
    status,
    progressionMode: ProgressionMode.SEQUENTIAL,
    sourceLocale: "fr",
    price: 25000,
    compareAtPrice: null,
    currency: "XOF",
    accessDurationDays: null,
    category: null,
    level: null,
    estimatedDurationMinutes: null,
    coverImageUrl: null,
    instructorIds: ["user-1"],
    publishedAt: null,
    certificateTemplateId: null,
  });
}

describe("Course entity - purchasability and editability", () => {
  it("is purchasable only when published", () => {
    expect(buildCourse(CourseStatus.PUBLISHED).isPurchasable()).toBe(true);
    expect(buildCourse(CourseStatus.DRAFT).isPurchasable()).toBe(false);
    expect(buildCourse(CourseStatus.HIDDEN).isPurchasable()).toBe(false);
    expect(buildCourse(CourseStatus.ARCHIVED).isPurchasable()).toBe(false);
  });

  it("is editable unless archived (ENT-21)", () => {
    expect(buildCourse(CourseStatus.DRAFT).isEditable()).toBe(true);
    expect(buildCourse(CourseStatus.PUBLISHED).isEditable()).toBe(true);
    expect(buildCourse(CourseStatus.HIDDEN).isEditable()).toBe(true);
    expect(buildCourse(CourseStatus.ARCHIVED).isEditable()).toBe(false);
  });
});

describe("Course entity - status transitions (section 8.1)", () => {
  it("publishes a draft course and records the publication date", () => {
    const course = buildCourse(CourseStatus.DRAFT);
    course.publish();
    expect(course.status).toBe(CourseStatus.PUBLISHED);
  });

  it("allows hiding a published course (access for enrolled learners preserved elsewhere)", () => {
    const course = buildCourse(CourseStatus.PUBLISHED);
    course.hide();
    expect(course.status).toBe(CourseStatus.HIDDEN);
  });

  it("allows republishing a hidden course", () => {
    const course = buildCourse(CourseStatus.HIDDEN);
    course.publish();
    expect(course.status).toBe(CourseStatus.PUBLISHED);
  });

  it("allows archiving from draft, published or hidden", () => {
    expect(() => buildCourse(CourseStatus.DRAFT).archive()).not.toThrow();
    expect(() => buildCourse(CourseStatus.PUBLISHED).archive()).not.toThrow();
    expect(() => buildCourse(CourseStatus.HIDDEN).archive()).not.toThrow();
  });

  it("rejects any transition out of archived", () => {
    const course = buildCourse(CourseStatus.ARCHIVED);
    expect(() => course.publish()).toThrow(InvalidStateTransitionError);
    expect(() => course.hide()).toThrow(InvalidStateTransitionError);
    expect(() => course.archive()).toThrow(InvalidStateTransitionError);
  });

  it("rejects hiding a draft course directly", () => {
    const course = buildCourse(CourseStatus.DRAFT);
    expect(() => course.hide()).toThrow(InvalidStateTransitionError);
  });
});

describe("Course entity - accessors and publication date", () => {
  it("exposes every persisted property", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const course = Course.fromPersistence({
      id: "course-9",
      tenantId: "tenant-9",
      title: "Titre",
      subtitle: "Sous-titre",
      description: "Desc",
      type: CourseType.CERTIFYING,
      status: CourseStatus.PUBLISHED,
      progressionMode: ProgressionMode.SEQUENTIAL,
      sourceLocale: "en",
      price: 1000,
      compareAtPrice: 2000,
      currency: "EUR",
      accessDurationDays: 90,
      category: "finance",
      level: "beginner",
      estimatedDurationMinutes: 120,
      coverImageUrl: "https://cdn/x.png",
      instructorIds: ["u1", "u2"],
      publishedAt,
      certificateTemplateId: "tpl-1",
    });

    expect(course).toMatchObject({
      id: "course-9",
      tenantId: "tenant-9",
      title: "Titre",
      subtitle: "Sous-titre",
      description: "Desc",
      type: CourseType.CERTIFYING,
      status: CourseStatus.PUBLISHED,
      progressionMode: ProgressionMode.SEQUENTIAL,
      sourceLocale: "en",
      price: 1000,
      compareAtPrice: 2000,
      currency: "EUR",
      accessDurationDays: 90,
      category: "finance",
      level: "beginner",
      estimatedDurationMinutes: 120,
      coverImageUrl: "https://cdn/x.png",
      instructorIds: ["u1", "u2"],
      publishedAt,
      certificateTemplateId: "tpl-1",
    });
  });

  it("sets the publication date on first publication", () => {
    const course = buildCourse(CourseStatus.DRAFT);

    course.publish();

    expect(course.publishedAt).toBeInstanceOf(Date);
  });

  it("keeps the original publication date when republishing a hidden course", () => {
    const course = buildCourse(CourseStatus.DRAFT);
    course.publish();
    const first = course.publishedAt;
    course.hide();
    course.publish();

    expect(course.publishedAt).toBe(first);
  });
});
