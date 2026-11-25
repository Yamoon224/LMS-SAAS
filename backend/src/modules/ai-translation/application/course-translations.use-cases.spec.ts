import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LanguagesFacade } from "@modules/languages/languages.facade";
import { NotFoundDomainError } from "@shared/errors";

import { TranslationNotPublishableError } from "../domain/translation-publication";

import { ListCourseTranslationsUseCase, SetCourseTranslationPublicationUseCase } from "./course-translations.use-cases";

function build(options: {
  courseLocales?: { locale: string; status: "DRAFT" | "PUBLISHED"; origin: "SOURCE" | "AI" | "MANUAL" }[];
  lessonSummaries?: { locale: string; status: "DRAFT" | "PUBLISHED"; count: number }[];
  assertEnabled?: jest.Mock;
  findByIdInTenant?: jest.Mock;
}) {
  const calls: string[] = [];
  const courses = {
    findByIdInTenant:
      options.findByIdInTenant ?? jest.fn().mockResolvedValue({ id: "c1", sourceLocale: "fr", tenantId: "t1" }),
    listCourseLocales: jest.fn().mockResolvedValue(options.courseLocales ?? []),
    setCourseLocaleStatus: jest.fn().mockImplementation(async (_c: string, locale: string, status: string) => {
      calls.push(`course:${locale}:${status}`);
      return true;
    }),
  } as unknown as jest.Mocked<CoursesFacade>;
  const content = {
    listModules: jest.fn().mockResolvedValue([{ id: "m1" }, { id: "m2" }]),
    listLessons: jest.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]),
    summarizeLessonLocales: jest.fn().mockResolvedValue(options.lessonSummaries ?? []),
    setLessonLocalesStatus: jest.fn().mockImplementation(async (_c: string, locale: string, status: string) => {
      calls.push(`lessons:${locale}:${status}`);
      return 2;
    }),
  } as unknown as jest.Mocked<CourseContentFacade>;
  const languages = {
    assertEnabled: options.assertEnabled ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as LanguagesFacade;
  return { courses, content, languages, calls };
}

describe("ListCourseTranslationsUseCase", () => {
  it("compte les leçons de tous les modules et cumule brouillons et publiées par langue", async () => {
    const { courses, content } = build({
      courseLocales: [{ locale: "en", status: "DRAFT", origin: "AI" }],
      lessonSummaries: [
        { locale: "en", status: "DRAFT", count: 1 },
        { locale: "en", status: "PUBLISHED", count: 1 },
      ],
    });
    const [entry] = await new ListCourseTranslationsUseCase(courses, content).execute("c1", "t1");
    expect(entry).toMatchObject({ locale: "en", lessonsTranslated: 2, lessonsTotal: 4, coveragePercent: 50 });
  });

  it("refuse la formation d'une autre entreprise", async () => {
    const { courses, content } = build({ findByIdInTenant: jest.fn().mockRejectedValue(new NotFoundDomainError("x")) });
    await expect(new ListCourseTranslationsUseCase(courses, content).execute("c1", "autre")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(courses.listCourseLocales).not.toHaveBeenCalled();
  });
});

describe("SetCourseTranslationPublicationUseCase", () => {
  const ready = {
    courseLocales: [{ locale: "en", status: "DRAFT" as const, origin: "AI" as const }],
    lessonSummaries: [{ locale: "en", status: "DRAFT" as const, count: 3 }],
  };

  it("publie les leçons d'abord et la fiche en dernier (la fiche est la porte côté apprenant)", async () => {
    const { courses, content, languages, calls } = build(ready);
    await new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "t1", "en", true);
    expect(calls).toEqual(["lessons:en:PUBLISHED", "course:en:PUBLISHED"]);
  });

  it("retire la fiche d'abord et les leçons ensuite : la langue disparaît immédiatement pour l'apprenant", async () => {
    const { courses, content, languages, calls } = build(ready);
    await new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "t1", "en", false);
    expect(calls).toEqual(["course:en:DRAFT", "lessons:en:DRAFT"]);
  });

  it("le retrait n'exige pas que la langue soit encore activée sur la plateforme", async () => {
    const { courses, content, languages } = build({
      ...ready,
      assertEnabled: jest.fn().mockRejectedValue(new Error("LANGUE_NON_ACTIVEE")),
    });
    await expect(
      new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "t1", "en", false),
    ).resolves.toBeUndefined();
  });

  it("refuse de publier une langue désactivée, sans rien modifier", async () => {
    const { courses, content, languages, calls } = build({
      ...ready,
      assertEnabled: jest.fn().mockRejectedValue(new Error("LANGUE_NON_ACTIVEE")),
    });
    await expect(
      new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "t1", "en", true),
    ).rejects.toThrow("LANGUE_NON_ACTIVEE");
    expect(calls).toEqual([]);
  });

  it.each([
    ["langue d'origine", "fr", ready],
    ["langue sans fiche traduite", "es", ready],
    ["langue sans leçon traduite", "en", { courseLocales: ready.courseLocales, lessonSummaries: [] }],
  ])("refuse de publier : %s, sans rien modifier", async (_label, locale, options) => {
    const { courses, content, languages, calls } = build(options);
    await expect(
      new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "t1", locale, true),
    ).rejects.toThrow(TranslationNotPublishableError);
    expect(calls).toEqual([]);
  });

  it("refuse la formation d'une autre entreprise avant toute écriture", async () => {
    const { courses, content, languages, calls } = build({
      findByIdInTenant: jest.fn().mockRejectedValue(new NotFoundDomainError("x")),
    });
    await expect(
      new SetCourseTranslationPublicationUseCase(courses, content, languages).execute("c1", "autre", "en", true),
    ).rejects.toThrow(NotFoundDomainError);
    expect(calls).toEqual([]);
  });
});
