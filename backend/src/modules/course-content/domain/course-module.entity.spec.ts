import { CourseModule } from "./course-module.entity";

describe("CourseModule entity (ENT-22)", () => {
  const build = () =>
    CourseModule.fromPersistence({
      id: "mod-1",
      courseId: "course-1",
      title: "Introduction",
      description: "desc",
      order: 1,
      estimatedDurationMinutes: 30,
    });

  it("exposes its persisted properties", () => {
    const courseModule = build();

    expect(courseModule.id).toBe("mod-1");
    expect(courseModule.courseId).toBe("course-1");
    expect(courseModule.title).toBe("Introduction");
    expect(courseModule.order).toBe(1);
  });

  it("changes its order on reorder", () => {
    const courseModule = build();

    courseModule.reorder(5);

    expect(courseModule.order).toBe(5);
  });
});
