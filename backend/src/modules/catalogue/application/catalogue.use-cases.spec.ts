import type { CourseContentFacade } from "@modules/course-content/course-content.facade";
import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { LanguagesFacade } from "@modules/languages/languages.facade";
import type { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import { NotFoundDomainError } from "@shared/errors";

import { parseCatalogueQuery } from "../domain/catalogue-query";

import { GetPublicCourseUseCase } from "./get-public-course.use-case";
import { ListPublicCatalogueUseCase } from "./list-public-catalogue.use-case";

const course = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tenantId: "t1",
  title: `Cours ${id}`,
  subtitle: null,
  description: "Description",
  price: 1000,
  compareAtPrice: null,
  currency: "XOF",
  type: "CERTIFYING",
  category: "Tech",
  level: "BEGINNER",
  estimatedDurationMinutes: 60,
  coverImageUrl: null,
  sourceLocale: "fr",
  progressionMode: "SEQUENTIAL",
  accessDurationDays: null,
  publishedAt: new Date("2026-01-01"),
  instructorIds: ["u1", "u2"],
  ...overrides,
});

describe("ListPublicCatalogueUseCase", () => {
  function build() {
    const coursesFacade = {
      listPublished: jest.fn().mockResolvedValue([course("a"), course("b", { price: 0, category: "Droit" })]),
      listPublishedLocalesByCourses: jest.fn().mockResolvedValue(new Map([["a", ["en", "de"]]])),
    } as unknown as CoursesFacade;
    // « de » n'est plus activée : sa traduction n'est pas lisible.
    const languagesFacade = { filterEnabled: jest.fn().mockResolvedValue(["en"]) } as unknown as LanguagesFacade;
    return { coursesFacade, useCase: new ListPublicCatalogueUseCase(coursesFacade, languagesFacade) };
  }

  it("liste les formations publiées du tenant avec facettes et langues lisibles seulement", async () => {
    const { coursesFacade, useCase } = build();
    const result = await useCase.execute("t1", parseCatalogueQuery({ sort: "title" }));
    expect(coursesFacade.listPublished).toHaveBeenCalledWith("t1");
    expect(result.total).toBe(2);
    expect(result.items[0]?.languages).toEqual(["fr", "en"]);
    expect(result.facets.languages.map((f) => f.value)).toEqual(["en", "fr"]);
  });

  it("applique filtre gratuit et pagination", async () => {
    const { useCase } = build();
    const result = await useCase.execute("t1", parseCatalogueQuery({ price: "free", pageSize: "1" }));
    expect(result.items.map((item) => item.id)).toEqual(["b"]);
    expect(result.items[0]).not.toHaveProperty("description");
    expect(Object.keys(result.items[0] ?? {}).sort()).toEqual(
      [
        "category", "compareAtPrice", "coverImageUrl", "currency", "estimatedDurationMinutes", "id", "language",
        "languages", "level", "price", "publishedAt", "subtitle", "title", "type",
      ].sort(),
    );
  });
});

function buildGet(options: { notFound?: boolean } = {}) {
  const coursesFacade = {
    findPublished: jest.fn().mockImplementation(async () => {
      if (options.notFound) throw new NotFoundDomainError("Formation introuvable");
      return course("a");
    }),
    listPublishedCourseLocales: jest.fn().mockResolvedValue(["en", "de"]),
  } as unknown as CoursesFacade;
  const courseContentFacade = {
    listModules: jest.fn().mockResolvedValue([
      { id: "m2", title: "Module 2", order: 2 },
      { id: "m1", title: "Module 1", order: 1 },
    ]),
    listLessons: jest.fn().mockImplementation(async (moduleId: string) => [
      {
        id: `${moduleId}-l2`, title: "Leçon B", order: 2, resourceType: "PDF",
        contentHtml: "<p>PAYANT</p>", storageUrl: "s3://secret/video.mp4",
      },
      {
        id: `${moduleId}-l1`, title: "Leçon A", order: 1, resourceType: "VIDEO",
        contentHtml: "<p>PAYANT</p>", storageUrl: "s3://secret/doc.pdf",
      },
    ]),
  } as unknown as CourseContentFacade;
  const liveSessionsFacade = {
    listUpcomingForCourses: jest.fn().mockResolvedValue([
      { id: "ls1", title: "Live 1", startAt: new Date("2026-12-01T10:00:00Z"), durationMinutes: 60, meetLink: "https://meet/secret", replayUrl: "https://replay/secret" },
    ]),
  } as unknown as LiveSessionsFacade;
  const usersFacade = {
    findManyByIds: jest.fn().mockResolvedValue([
      { id: "u1", tenantId: "t1", fullName: "Awa Koné", email: "awa@x.tld" },
      { id: "u2", tenantId: "autre-tenant", fullName: "Intrus", email: "i@x.tld" },
    ]),
  } as unknown as UsersFacade;
  const languagesFacade = { filterEnabled: jest.fn().mockResolvedValue(["en"]) } as unknown as LanguagesFacade;
  return {
    coursesFacade,
    useCase: new GetPublicCourseUseCase(coursesFacade, courseContentFacade, liveSessionsFacade, usersFacade, languagesFacade),
  };
}

describe("GetPublicCourseUseCase", () => {
  it("expose programme (titres), formateurs, langues lisibles, sessions et type certifiant", async () => {
    const { useCase } = buildGet();
    const result = await useCase.execute("a", "t1");
    expect(result.syllabus).toEqual([
      { title: "Module 1", lessons: [{ title: "Leçon A", resourceType: "VIDEO" }, { title: "Leçon B", resourceType: "PDF" }] },
      { title: "Module 2", lessons: [{ title: "Leçon A", resourceType: "VIDEO" }, { title: "Leçon B", resourceType: "PDF" }] },
    ]);
    expect(result.modulesCount).toBe(2);
    expect(result.lessonsCount).toBe(4);
    expect(result.languages).toEqual(["fr", "en"]);
    expect(result.certifying).toBe(true);
    expect(result.instructors).toEqual([{ name: "Awa Koné" }]);
    expect(result.upcomingSessions).toEqual([
      { title: "Live 1", startAt: new Date("2026-12-01T10:00:00Z"), durationMinutes: 60 },
    ]);
  });

  it("ne fuit aucun contenu payant, aucune URL de média ni aucun lien de session", async () => {
    const { useCase } = buildGet();
    const json = JSON.stringify(await useCase.execute("a", "t1"));
    for (const secret of ["PAYANT", "contentHtml", "storageUrl", "s3://", "meet/secret", "replay/secret", "awa@x.tld", "u1", "Intrus"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("renvoie 404 pour une formation non publiée, inconnue ou d'un autre tenant", async () => {
    const { useCase } = buildGet({ notFound: true });
    await expect(useCase.execute("a", "t1")).rejects.toThrow(NotFoundDomainError);
  });

  it("interroge la formation dans le tenant courant uniquement", async () => {
    const { coursesFacade, useCase } = buildGet();
    await useCase.execute("a", "t1");
    expect(coursesFacade.findPublished).toHaveBeenCalledWith("a", "t1");
  });
});
