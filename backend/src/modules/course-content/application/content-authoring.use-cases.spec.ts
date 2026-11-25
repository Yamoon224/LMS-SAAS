import type { CoursesFacade } from "@modules/courses/courses.facade";
import { NotFoundDomainError } from "@shared/errors";

import { CourseModule } from "../domain/course-module.entity";
import type { CourseModuleRepositoryPort } from "../domain/course-module.repository.port";
import { Lesson } from "../domain/lesson.entity";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";
import { ResourceType } from "../domain/resource-type";

import { CourseNotEditableForContentError, CreateModuleUseCase } from "./create-module.use-case";
import { CreateLessonUseCase, type CreateLessonInput } from "./create-lesson.use-case";
import { DeleteLessonUseCase } from "./delete-lesson.use-case";
import { DeleteModuleUseCase } from "./delete-module.use-case";
import { GetLessonInCourseUseCase } from "./get-lesson-in-course.use-case";
import { ListLessonsUseCase } from "./list-lessons.use-case";
import { ListModulesUseCase } from "./list-modules.use-case";
import { ReorderLessonsUseCase } from "./reorder-lessons.use-case";
import { ReorderModulesUseCase } from "./reorder-modules.use-case";
import { UpdateLessonUseCase } from "./update-lesson.use-case";
import { UpdateModuleUseCase } from "./update-module.use-case";

const courseModule = CourseModule.fromPersistence({
  id: "mod-1",
  courseId: "course-1",
  title: "Module",
  description: null,
  order: 0,
  estimatedDurationMinutes: null,
});

const lesson = Lesson.fromPersistence({
  id: "lesson-1",
  moduleId: "mod-1",
  title: "Leçon",
  order: 0,
  contentHtml: null,
  resourceType: ResourceType.TEXT,
  storageUrl: null,
  isMandatory: false,
  completionCriteria: null,
  downloadAllowed: false,
});

function lessonRepo(found: Lesson | null = lesson) {
  return {
    findById: jest.fn().mockResolvedValue(found),
    listByModule: jest.fn().mockResolvedValue([lesson]),
    create: jest.fn().mockResolvedValue(lesson),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
    nextOrder: jest.fn().mockResolvedValue(4),
  };
}

function moduleRepo(found: CourseModule | null = courseModule) {
  return {
    findById: jest.fn().mockResolvedValue(found),
    listByCourse: jest.fn().mockResolvedValue([courseModule]),
    create: jest.fn().mockResolvedValue(courseModule),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
    nextOrder: jest.fn().mockResolvedValue(2),
  };
}

describe("CreateLessonUseCase (ENT-23/ENT-24)", () => {
  const input: CreateLessonInput = {
    moduleId: "mod-1",
    title: "Nouvelle",
    contentHtml: "<p>Bonjour</p><script>alert(1)</script>",
    resourceType: ResourceType.TEXT,
    isMandatory: true,
    downloadAllowed: false,
  };

  it("creates the lesson at the next order with sanitized HTML", async () => {
    const lessons = lessonRepo();
    const useCase = new CreateLessonUseCase(
      lessons as unknown as LessonRepositoryPort,
      moduleRepo() as unknown as CourseModuleRepositoryPort,
    );

    const result = await useCase.execute(input);

    expect(result).toBe(lesson);
    expect(lessons.nextOrder).toHaveBeenCalledWith("mod-1");
    const data = lessons.create.mock.calls[0][0] as { contentHtml: string; order: number; title: string };
    expect(data.order).toBe(4);
    expect(data.title).toBe("Nouvelle");
    expect(data.contentHtml).toContain("Bonjour");
    expect(data.contentHtml).not.toContain("script");
  });

  it("leaves the content undefined when no HTML is provided", async () => {
    const lessons = lessonRepo();
    const useCase = new CreateLessonUseCase(
      lessons as unknown as LessonRepositoryPort,
      moduleRepo() as unknown as CourseModuleRepositoryPort,
    );

    await useCase.execute({ ...input, contentHtml: undefined, resourceType: ResourceType.LINK });

    expect(lessons.create.mock.calls[0][0]).toMatchObject({ contentHtml: undefined, order: 4 });
  });

  it("raises NotFound when the module does not exist", async () => {
    const lessons = lessonRepo();
    const useCase = new CreateLessonUseCase(
      lessons as unknown as LessonRepositoryPort,
      moduleRepo(null) as unknown as CourseModuleRepositoryPort,
    );

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundDomainError);
    expect(lessons.create).not.toHaveBeenCalled();
  });
});

describe("CreateModuleUseCase (ENT-22)", () => {
  const facade = (editable: boolean) =>
    ({
      findById: jest.fn().mockResolvedValue({ isEditable: () => editable }),
    }) as unknown as CoursesFacade;

  it("appends the module at the next order of the course", async () => {
    const modules = moduleRepo();
    const useCase = new CreateModuleUseCase(modules as unknown as CourseModuleRepositoryPort, facade(true));

    const result = await useCase.execute({ courseId: "course-1", title: "M", description: "d" });

    expect(result).toBe(courseModule);
    expect(modules.nextOrder).toHaveBeenCalledWith("course-1");
    expect(modules.create).toHaveBeenCalledWith({ courseId: "course-1", title: "M", description: "d", order: 2 });
  });

  it("refuses to add a module to an archived course", async () => {
    const modules = moduleRepo();
    const useCase = new CreateModuleUseCase(modules as unknown as CourseModuleRepositoryPort, facade(false));

    await expect(useCase.execute({ courseId: "course-1", title: "M" })).rejects.toThrow(
      CourseNotEditableForContentError,
    );
    expect(modules.create).not.toHaveBeenCalled();
  });
});

describe("UpdateLessonUseCase", () => {
  it("sanitizes the HTML before updating", async () => {
    const lessons = lessonRepo();
    const useCase = new UpdateLessonUseCase(lessons as unknown as LessonRepositoryPort);

    await useCase.execute("lesson-1", { title: "T", contentHtml: "<p>Ok</p><script>x</script>" });

    const [id, data] = lessons.update.mock.calls[0] as [string, { title: string; contentHtml: string }];
    expect(id).toBe("lesson-1");
    expect(data.title).toBe("T");
    expect(data.contentHtml).toContain("Ok");
    expect(data.contentHtml).not.toContain("script");
  });

  it("accepts an empty string to clear the content", async () => {
    const lessons = lessonRepo();

    await new UpdateLessonUseCase(lessons as unknown as LessonRepositoryPort).execute("lesson-1", { contentHtml: "" });

    expect(lessons.update).toHaveBeenCalledWith("lesson-1", { contentHtml: "" });
  });

  it("leaves the content untouched when not provided", async () => {
    const lessons = lessonRepo();

    await new UpdateLessonUseCase(lessons as unknown as LessonRepositoryPort).execute("lesson-1", { title: "Seul" });

    expect(lessons.update).toHaveBeenCalledWith("lesson-1", { title: "Seul", contentHtml: undefined });
  });

  it("raises NotFound for an unknown lesson", async () => {
    const lessons = lessonRepo(null);

    await expect(
      new UpdateLessonUseCase(lessons as unknown as LessonRepositoryPort).execute("nope", { title: "x" }),
    ).rejects.toThrow(NotFoundDomainError);
    expect(lessons.update).not.toHaveBeenCalled();
  });
});

describe("UpdateModuleUseCase", () => {
  it("updates an existing module", async () => {
    const modules = moduleRepo();

    await new UpdateModuleUseCase(modules as unknown as CourseModuleRepositoryPort).execute("mod-1", { title: "N" });

    expect(modules.update).toHaveBeenCalledWith("mod-1", { title: "N" });
  });

  it("raises NotFound for an unknown module", async () => {
    const modules = moduleRepo(null);

    await expect(
      new UpdateModuleUseCase(modules as unknown as CourseModuleRepositoryPort).execute("nope", { title: "N" }),
    ).rejects.toThrow(NotFoundDomainError);
    expect(modules.update).not.toHaveBeenCalled();
  });
});

describe("DeleteLessonUseCase", () => {
  it("deletes an existing lesson", async () => {
    const lessons = lessonRepo();

    await new DeleteLessonUseCase(lessons as unknown as LessonRepositoryPort).execute("lesson-1");

    expect(lessons.delete).toHaveBeenCalledWith("lesson-1");
  });

  it("raises NotFound for an unknown lesson", async () => {
    const lessons = lessonRepo(null);

    await expect(new DeleteLessonUseCase(lessons as unknown as LessonRepositoryPort).execute("nope")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(lessons.delete).not.toHaveBeenCalled();
  });
});

describe("DeleteModuleUseCase", () => {
  it("deletes an existing module", async () => {
    const modules = moduleRepo();

    await new DeleteModuleUseCase(modules as unknown as CourseModuleRepositoryPort).execute("mod-1");

    expect(modules.delete).toHaveBeenCalledWith("mod-1");
  });

  it("raises NotFound for an unknown module", async () => {
    const modules = moduleRepo(null);

    await expect(
      new DeleteModuleUseCase(modules as unknown as CourseModuleRepositoryPort).execute("nope"),
    ).rejects.toThrow(NotFoundDomainError);
    expect(modules.delete).not.toHaveBeenCalled();
  });
});

describe("GetLessonInCourseUseCase (PUB-09)", () => {
  const build = (found: Lesson | null, mod: CourseModule | null) =>
    new GetLessonInCourseUseCase(
      lessonRepo(found) as unknown as LessonRepositoryPort,
      moduleRepo(mod) as unknown as CourseModuleRepositoryPort,
    );

  it("returns the lesson when its module belongs to the course", async () => {
    await expect(build(lesson, courseModule).execute("lesson-1", "course-1")).resolves.toBe(lesson);
  });

  it("returns null for an unknown lesson", async () => {
    await expect(build(null, courseModule).execute("lesson-1", "course-1")).resolves.toBeNull();
  });

  it("returns null when the lesson belongs to another course", async () => {
    await expect(build(lesson, courseModule).execute("lesson-1", "other-course")).resolves.toBeNull();
  });

  it("returns null when the module no longer exists", async () => {
    await expect(build(lesson, null).execute("lesson-1", "course-1")).resolves.toBeNull();
  });
});

describe("List and reorder use cases (ENT-22)", () => {
  it("lists the lessons of a module", async () => {
    const lessons = lessonRepo();

    await expect(new ListLessonsUseCase(lessons as unknown as LessonRepositoryPort).execute("mod-1")).resolves.toEqual([
      lesson,
    ]);
    expect(lessons.listByModule).toHaveBeenCalledWith("mod-1");
  });

  it("lists the modules of a course", async () => {
    const modules = moduleRepo();

    await expect(
      new ListModulesUseCase(modules as unknown as CourseModuleRepositoryPort).execute("course-1"),
    ).resolves.toEqual([courseModule]);
    expect(modules.listByCourse).toHaveBeenCalledWith("course-1");
  });

  it("reorders the lessons of a module", async () => {
    const lessons = lessonRepo();

    await new ReorderLessonsUseCase(lessons as unknown as LessonRepositoryPort).execute("mod-1", ["b", "a"]);

    expect(lessons.reorder).toHaveBeenCalledWith("mod-1", ["b", "a"]);
  });

  it("reorders the modules of a course", async () => {
    const modules = moduleRepo();

    await new ReorderModulesUseCase(modules as unknown as CourseModuleRepositoryPort).execute("course-1", ["m2", "m1"]);

    expect(modules.reorder).toHaveBeenCalledWith("course-1", ["m2", "m1"]);
  });
});
