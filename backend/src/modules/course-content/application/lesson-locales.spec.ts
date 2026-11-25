import type { LessonLocaleRepositoryPort } from "../domain/lesson-locale.repository.port";

import { ManageLessonLocalesUseCase } from "./manage-lesson-locales.use-case";
import { UpsertLessonLocaleUseCase } from "./upsert-lesson-locale.use-case";

function buildRepository(overrides: Partial<jest.Mocked<LessonLocaleRepositoryPort>> = {}) {
  const repository: jest.Mocked<LessonLocaleRepositoryPort> = {
    findByLessonAndLocale: jest.fn(),
    upsert: jest.fn().mockResolvedValue(undefined),
    findPublished: jest.fn().mockResolvedValue(null),
    listPublishedTitles: jest.fn().mockResolvedValue([]),
    summarizeByCourse: jest.fn().mockResolvedValue([]),
    setStatusForCourse: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  return repository;
}

const MALICIOUS = '<p>Bonjour</p><script>alert(1)</script><img src="x" onerror="alert(2)">';

describe("UpsertLessonLocaleUseCase — le HTML traduit est assaini à l'écriture (BE-09)", () => {
  it("retire scripts et gestionnaires d'événements avant d'enregistrer", async () => {
    const repository = buildRepository();
    await new UpsertLessonLocaleUseCase(repository).execute({
      lessonId: "l1",
      locale: "en",
      title: "Hello",
      contentHtml: MALICIOUS,
      origin: "AI",
    });
    const saved = repository.upsert.mock.calls[0]?.[0].contentHtml ?? "";
    expect(saved).toContain("<p>Bonjour</p>");
    expect(saved).not.toContain("<script");
    expect(saved).not.toContain("onerror");
    expect(saved).not.toContain("alert(");
  });

  it("laisse passer une absence de contenu (leçon sans texte)", async () => {
    const repository = buildRepository();
    await new UpsertLessonLocaleUseCase(repository).execute({
      lessonId: "l1",
      locale: "en",
      title: "Hello",
      contentHtml: null,
      origin: "AI",
    });
    expect(repository.upsert.mock.calls[0]?.[0].contentHtml).toBeNull();
  });
});

describe("ManageLessonLocalesUseCase", () => {
  it("ne renvoie rien pour une traduction absente ou en brouillon", async () => {
    const result = await new ManageLessonLocalesUseCase(buildRepository()).findPublished("l1", "en");
    expect(result).toBeNull();
  });

  it("assainit aussi à la lecture : couvre les lignes écrites avant la correction de l'écriture", async () => {
    const repository = buildRepository({
      findPublished: jest.fn().mockResolvedValue({ title: "Hello", contentHtml: MALICIOUS }),
    });
    const result = await new ManageLessonLocalesUseCase(repository).findPublished("l1", "en");
    expect(result?.title).toBe("Hello");
    expect(result?.contentHtml).toContain("<p>Bonjour</p>");
    expect(result?.contentHtml).not.toContain("<script");
    expect(result?.contentHtml).not.toContain("onerror");
  });

  it("garde un contenu absent à null", async () => {
    const repository = buildRepository({ findPublished: jest.fn().mockResolvedValue({ title: "Hi", contentHtml: null }) });
    expect((await new ManageLessonLocalesUseCase(repository).findPublished("l1", "en"))?.contentHtml).toBeNull();
  });

  it("indexe les titres publiés par leçon et ignore les titres vides", async () => {
    const repository = buildRepository({
      listPublishedTitles: jest.fn().mockResolvedValue([
        { lessonId: "l1", title: "One" },
        { lessonId: "l2", title: null },
        { lessonId: "l3", title: "" },
      ]),
    });
    const titles = await new ManageLessonLocalesUseCase(repository).listPublishedTitles("c1", "en");
    expect([...titles.entries()]).toEqual([["l1", "One"]]);
  });

  it("délègue le changement de statut par formation et par langue", async () => {
    const repository = buildRepository({ setStatusForCourse: jest.fn().mockResolvedValue(4) });
    await expect(new ManageLessonLocalesUseCase(repository).setStatus("c1", "en", "PUBLISHED")).resolves.toBe(4);
    expect(repository.setStatusForCourse).toHaveBeenCalledWith("c1", "en", "PUBLISHED");
  });

  it("expose le résumé des traductions par langue et statut", async () => {
    const summary = [{ locale: "en", status: "PUBLISHED" as const, count: 3 }];
    const repository = buildRepository({ summarizeByCourse: jest.fn().mockResolvedValue(summary) });

    await expect(new ManageLessonLocalesUseCase(repository).summarize("c1")).resolves.toBe(summary);
    expect(repository.summarizeByCourse).toHaveBeenCalledWith("c1");
  });
});
