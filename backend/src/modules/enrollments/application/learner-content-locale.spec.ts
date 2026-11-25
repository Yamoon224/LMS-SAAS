import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LanguagesFacade } from "@modules/languages/languages.facade";
import type { MediaFacade } from "@modules/media/media.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import type { GetAccessibleModulesUseCase } from "./get-accessible-modules.use-case";
import type { GetEnrollmentUseCase } from "./get-enrollment.use-case";
import { GetLearnerCourseContentUseCase } from "./get-learner-course-content.use-case";
import { GetLearnerLessonUseCase } from "./get-learner-lesson.use-case";
import {
  FindReadableTranslationsUseCase,
  ListLearnerCourseLocalesUseCase,
  ResolveLearnerContentLocaleUseCase,
} from "./learner-content-locale.use-cases";

const SOURCE_LESSON = {
  id: "l1",
  moduleId: "m1",
  title: "Introduction",
  order: 1,
  resourceType: "TEXT",
  storageUrl: null,
  isMandatory: true,
  completionCriteria: null,
  downloadAllowed: false,
  contentHtml: "<p>Bonjour</p>",
  isCompletedBy: () => false,
};

function build(options: {
  publishedLocales?: string[];
  enabledLocales?: string[];
  translated?: { title: string | null; contentHtml: string | null } | null;
  hasContentAccess?: boolean;
}) {
  const enrollment = {
    courseId: "c1",
    hasContentAccess: () => options.hasContentAccess ?? true,
  };
  const getEnrollment = { executeOwned: jest.fn().mockResolvedValue(enrollment) } as unknown as GetEnrollmentUseCase;
  const courses = {
    findByIdInTenant: jest.fn().mockResolvedValue({ sourceLocale: "fr", progressionMode: "SEQUENTIAL" }),
    listPublishedCourseLocales: jest.fn().mockResolvedValue(options.publishedLocales ?? []),
  } as unknown as jest.Mocked<CoursesFacade>;
  const languages = {
    filterEnabled: jest
      .fn()
      .mockImplementation(async (codes: string[]) =>
        codes.filter((code) => (options.enabledLocales ?? ["fr", "en", "ar", "es"]).includes(code)),
      ),
  } as unknown as LanguagesFacade;
  const content = {
    findLessonInCourse: jest.fn().mockResolvedValue(SOURCE_LESSON),
    findPublishedLessonLocale: jest.fn().mockResolvedValue(options.translated ?? null),
    listPublishedLessonTitles: jest.fn().mockResolvedValue(new Map([["l1", "Intro"]])),
    listLessons: jest.fn().mockResolvedValue([SOURCE_LESSON]),
  } as unknown as jest.Mocked<CourseContentFacade>;
  const access = {
    execute: jest.fn().mockResolvedValue([{ moduleId: "m1", title: "Module", order: 1, accessible: true, validated: false }]),
  } as unknown as GetAccessibleModulesUseCase;
  const progress = {
    findByEnrollmentAndLesson: jest.fn().mockResolvedValue(null),
    listByEnrollment: jest.fn().mockResolvedValue([]),
  } as unknown as ProgressRepositoryPort;

  const readable = new FindReadableTranslationsUseCase(courses, languages);
  const resolver = new ResolveLearnerContentLocaleUseCase(readable);
  return {
    courses,
    content,
    readable,
    resolver,
    list: new ListLearnerCourseLocalesUseCase(getEnrollment, courses, readable),
    lesson: new GetLearnerLessonUseCase(getEnrollment, courses, content, access, {} as MediaFacade, progress, resolver),
    summary: new GetLearnerCourseContentUseCase(getEnrollment, courses, content, access, progress, resolver),
  };
}

describe("langues lisibles d'une formation", () => {
  it("ne propose que les fiches publiées dont la langue est toujours activée sur la plateforme", async () => {
    const { readable } = build({ publishedLocales: ["en", "ar", "es"], enabledLocales: ["fr", "en", "es"] });
    await expect(readable.execute("c1")).resolves.toEqual(["en", "es"]);
  });

  it("liste l'origine d'abord puis les traductions lisibles", async () => {
    const { list } = build({ publishedLocales: ["en", "ar"] });
    await expect(list.execute("e1", "u1", "t1")).resolves.toEqual({ sourceLocale: "fr", available: ["fr", "en", "ar"] });
  });

  it("refuse une inscription sans accès actif (404 uniforme)", async () => {
    const { list, courses } = build({ hasContentAccess: false, publishedLocales: ["en"] });
    await expect(list.execute("e1", "u1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(courses.listPublishedCourseLocales).not.toHaveBeenCalled();
  });
});

describe("ResolveLearnerContentLocaleUseCase", () => {
  it("ne fait aucune requête quand aucune langue (ou l'origine) est demandée", async () => {
    const { resolver, courses } = build({ publishedLocales: ["en"] });
    await expect(resolver.execute("c1", "fr", undefined)).resolves.toBeNull();
    await expect(resolver.execute("c1", "fr", "fr")).resolves.toBeNull();
    expect(courses.listPublishedCourseLocales).not.toHaveBeenCalled();
  });

  it("applique une langue lisible et ignore une langue non publiée ou désactivée", async () => {
    const { resolver } = build({ publishedLocales: ["en", "ar"], enabledLocales: ["fr", "en"] });
    await expect(resolver.execute("c1", "fr", "en")).resolves.toBe("en");
    await expect(resolver.execute("c1", "fr", "ar")).resolves.toBeNull();
    await expect(resolver.execute("c1", "fr", "de")).resolves.toBeNull();
  });
});

describe("GetLearnerLessonUseCase — langue de lecture (PUB-17)", () => {
  it("sert la traduction publiée quand la langue est lisible", async () => {
    const { lesson } = build({ publishedLocales: ["en"], translated: { title: "Intro", contentHtml: "<p>Hello</p>" } });
    const view = await lesson.execute("e1", "l1", "u1", "t1", "en");
    expect(view).toMatchObject({ title: "Intro", contentHtml: "<p>Hello</p>", contentLocale: "en" });
  });

  it("sert l'origine, sans rien chercher, quand aucune langue n'est demandée", async () => {
    const { lesson, content } = build({ publishedLocales: ["en"] });
    const view = await lesson.execute("e1", "l1", "u1", "t1");
    expect(view).toMatchObject({ title: "Introduction", contentHtml: "<p>Bonjour</p>", contentLocale: "fr" });
    expect(content.findPublishedLessonLocale).not.toHaveBeenCalled();
  });

  it("n'expose jamais un brouillon : sans traduction publiée de la leçon, l'origine est servie et annoncée comme telle", async () => {
    const { lesson } = build({ publishedLocales: ["en"], translated: null });
    const view = await lesson.execute("e1", "l1", "u1", "t1", "en");
    expect(view).toMatchObject({ title: "Introduction", contentHtml: "<p>Bonjour</p>", contentLocale: "fr" });
  });

  it("ne lit aucune traduction quand la langue demandée n'est pas lisible (non publiée)", async () => {
    const { lesson, content } = build({ publishedLocales: [] });
    const view = await lesson.execute("e1", "l1", "u1", "t1", "en");
    expect(view.contentLocale).toBe("fr");
    expect(content.findPublishedLessonLocale).not.toHaveBeenCalled();
  });

  it("complète champ par champ : titre traduit sans contenu traduit garde le contenu d'origine", async () => {
    const { lesson } = build({ publishedLocales: ["en"], translated: { title: "Intro", contentHtml: null } });
    const view = await lesson.execute("e1", "l1", "u1", "t1", "en");
    expect(view).toMatchObject({ title: "Intro", contentHtml: "<p>Bonjour</p>", contentLocale: "en" });
  });
});

describe("GetLearnerCourseContentUseCase — titres des leçons (PUB-17)", () => {
  it("traduit les titres de leçons publiés et laisse les titres de modules d'origine", async () => {
    const { summary } = build({ publishedLocales: ["en"] });
    const result = await summary.execute("e1", "u1", "t1", "en");
    expect(result.contentLocale).toBe("en");
    expect(result.modules[0]).toMatchObject({ title: "Module" });
    expect(result.modules[0]?.lessons[0]?.title).toBe("Intro");
  });

  it("garde les titres d'origine pour une langue non lisible", async () => {
    const { summary, content } = build({ publishedLocales: [] });
    const result = await summary.execute("e1", "u1", "t1", "en");
    expect(result.contentLocale).toBe("fr");
    expect(result.modules[0]?.lessons[0]?.title).toBe("Introduction");
    expect(content.listPublishedLessonTitles).not.toHaveBeenCalled();
  });
});
