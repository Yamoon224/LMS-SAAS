import type { CourseLocaleRepositoryPort } from "../domain/course-locale.repository.port";
import { CourseStatus } from "../domain/course-status";
import type { Course } from "../domain/course.entity";
import type { CourseRepositoryPort } from "../domain/course.repository.port";

import { GetCourseUseCase } from "./get-course.use-case";
import { ListCoursesUseCase } from "./list-courses.use-case";
import { ManageCourseLocalesUseCase } from "./manage-course-locales.use-case";
import { UpsertCourseLocaleUseCase } from "./upsert-course-locale.use-case";

describe("ListCoursesUseCase", () => {
  const courses = [{ id: "c1" }, { id: "c2" }] as unknown as Course[];
  const build = () => {
    const repository = { list: jest.fn().mockResolvedValue(courses) };
    return { repository, useCase: new ListCoursesUseCase(repository as unknown as CourseRepositoryPort) };
  };

  it("lists the tenant courses with the given filters", async () => {
    const { useCase, repository } = build();
    const filters = { tenantId: "t1", status: CourseStatus.DRAFT };

    await expect(useCase.listForTenant(filters)).resolves.toBe(courses);
    expect(repository.list).toHaveBeenCalledWith(filters);
  });

  it("lists only published courses for the public catalogue (PUB-02)", async () => {
    const { useCase, repository } = build();

    await expect(useCase.listPublished("t1", "finance")).resolves.toBe(courses);
    expect(repository.list).toHaveBeenCalledWith({
      tenantId: "t1",
      status: CourseStatus.PUBLISHED,
      category: "finance",
    });
  });

  it("does not restrict the category when none is given", async () => {
    const { useCase, repository } = build();

    await useCase.listPublished("t1");

    expect(repository.list).toHaveBeenCalledWith({
      tenantId: "t1",
      status: CourseStatus.PUBLISHED,
      category: undefined,
    });
  });
});

describe("GetCourseUseCase - global lookups", () => {
  it("returns a course by id", async () => {
    const course = { id: "c1" };
    const repository = { findById: jest.fn().mockResolvedValue(course) };

    await expect(new GetCourseUseCase(repository as unknown as CourseRepositoryPort).execute("c1")).resolves.toBe(
      course,
    );
    expect(repository.findById).toHaveBeenCalledWith("c1");
  });

  it("raises NotFound for an unknown id", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) };

    await expect(new GetCourseUseCase(repository as unknown as CourseRepositoryPort).execute("nope")).rejects.toThrow(
      "Formation introuvable: nope",
    );
  });

  it("loads several courses of a tenant in one query", async () => {
    const found = [{ id: "c1" }];
    const repository = { findManyByIdsInTenant: jest.fn().mockResolvedValue(found) };

    const result = await new GetCourseUseCase(repository as unknown as CourseRepositoryPort).executeManyInTenant(
      ["c1", "c2"],
      "t1",
    );

    expect(result).toBe(found);
    expect(repository.findManyByIdsInTenant).toHaveBeenCalledWith(["c1", "c2"], "t1");
  });
});

describe("ManageCourseLocalesUseCase (PUB-17)", () => {
  const build = () => {
    const repository = {
      listByCourse: jest.fn().mockResolvedValue([
        { locale: "en", status: "PUBLISHED", origin: "AI" },
        { locale: "es", status: "DRAFT", origin: "MANUAL" },
        { locale: "de", status: "PUBLISHED", origin: "MANUAL" },
      ]),
      listPublishedLocalesByCourses: jest.fn().mockResolvedValue(new Map([["c1", ["en"]]])),
      setStatus: jest.fn().mockResolvedValue(true),
    };
    return {
      repository,
      useCase: new ManageCourseLocalesUseCase(repository as unknown as CourseLocaleRepositoryPort),
    };
  };

  it("lists the locales of a course", async () => {
    const { useCase, repository } = build();

    const locales = await useCase.list("c1");

    expect(locales).toHaveLength(3);
    expect(repository.listByCourse).toHaveBeenCalledWith("c1");
  });

  it("keeps only the published locales", async () => {
    const { useCase } = build();

    await expect(useCase.listPublishedLocales("c1")).resolves.toEqual(["en", "de"]);
  });

  it("delegates the published locales of several courses", async () => {
    const { useCase, repository } = build();

    const result = await useCase.listPublishedLocalesByCourses(["c1"]);

    expect(result.get("c1")).toEqual(["en"]);
    expect(repository.listPublishedLocalesByCourses).toHaveBeenCalledWith(["c1"]);
  });

  it("returns the repository outcome when changing a locale status", async () => {
    const { useCase, repository } = build();
    repository.setStatus.mockResolvedValueOnce(false);

    await expect(useCase.setStatus("c1", "fr", "PUBLISHED")).resolves.toBe(false);
    await expect(useCase.setStatus("c1", "en", "DRAFT")).resolves.toBe(true);
    expect(repository.setStatus).toHaveBeenLastCalledWith("c1", "en", "DRAFT");
  });
});

describe("UpsertCourseLocaleUseCase (ENT-46)", () => {
  it("delegates the translated sheet to the repository", async () => {
    const repository = { upsert: jest.fn().mockResolvedValue(undefined) };
    const data = {
      courseId: "c1",
      locale: "en",
      title: "T",
      subtitle: null,
      description: null,
      origin: "AI" as const,
    };

    await new UpsertCourseLocaleUseCase(repository as unknown as CourseLocaleRepositoryPort).execute(data);

    expect(repository.upsert).toHaveBeenCalledWith(data);
  });
});
