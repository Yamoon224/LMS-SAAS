import { Lesson } from "./lesson.entity";
import { ResourceType } from "./resource-type";
import type { CompletionCriteria } from "./resource-type";

function buildLesson(overrides: {
  isMandatory?: boolean;
  completionCriteria?: CompletionCriteria | null;
}): Lesson {
  return Lesson.fromPersistence({
    id: "lesson-1",
    moduleId: "module-1",
    title: "Leçon 1",
    order: 0,
    contentHtml: null,
    resourceType: ResourceType.VIDEO,
    storageUrl: "https://cdn.example.com/video.mp4",
    isMandatory: overrides.isMandatory ?? true,
    completionCriteria: overrides.completionCriteria ?? null,
    downloadAllowed: false,
  });
}

describe("Lesson entity - isCompletedBy (RG-08a)", () => {
  it("is always completed when not mandatory, regardless of progress", () => {
    const lesson = buildLesson({ isMandatory: false });
    expect(lesson.isCompletedBy({ watchedPercent: 0, opened: false })).toBe(true);
  });

  it("requires the configured watched percentage for a mandatory video (ENT-25 example: 90%)", () => {
    const lesson = buildLesson({ isMandatory: true, completionCriteria: { watchedPercent: 90 } });

    expect(lesson.isCompletedBy({ watchedPercent: 89, opened: true })).toBe(false);
    expect(lesson.isCompletedBy({ watchedPercent: 90, opened: true })).toBe(true);
    expect(lesson.isCompletedBy({ watchedPercent: 100, opened: true })).toBe(true);
  });

  it("treats a null watchedPercent as 0 for a mandatory video", () => {
    const lesson = buildLesson({ isMandatory: true, completionCriteria: { watchedPercent: 50 } });
    expect(lesson.isCompletedBy({ watchedPercent: null, opened: true })).toBe(false);
  });

  it("requires only opening for a mandatory PDF (requiresOpen criteria)", () => {
    const lesson = buildLesson({ isMandatory: true, completionCriteria: { requiresOpen: true } });

    expect(lesson.isCompletedBy({ watchedPercent: null, opened: false })).toBe(false);
    expect(lesson.isCompletedBy({ watchedPercent: null, opened: true })).toBe(true);
  });

  it("falls back to opened when mandatory but no completion criteria is set", () => {
    const lesson = buildLesson({ isMandatory: true, completionCriteria: null });

    expect(lesson.isCompletedBy({ watchedPercent: null, opened: false })).toBe(false);
    expect(lesson.isCompletedBy({ watchedPercent: null, opened: true })).toBe(true);
  });
});

describe("Lesson entity - accessors and reorder", () => {
  it("exposes every persisted property", () => {
    const lesson = Lesson.fromPersistence({
      id: "l9",
      moduleId: "m9",
      title: "Titre",
      order: 3,
      contentHtml: "<p>x</p>",
      resourceType: ResourceType.PDF,
      storageUrl: "https://cdn.example.com/a.pdf",
      isMandatory: true,
      completionCriteria: { requiresOpen: true },
      downloadAllowed: true,
    });

    expect(lesson).toMatchObject({
      id: "l9",
      moduleId: "m9",
      title: "Titre",
      order: 3,
      contentHtml: "<p>x</p>",
      resourceType: ResourceType.PDF,
      storageUrl: "https://cdn.example.com/a.pdf",
      isMandatory: true,
      completionCriteria: { requiresOpen: true },
      downloadAllowed: true,
    });
  });

  it("changes its order on reorder", () => {
    const lesson = buildLesson({});

    lesson.reorder(7);

    expect(lesson.order).toBe(7);
  });

  it("falls back to opened for a mandatory lesson whose criteria define neither threshold nor opening", () => {
    const lesson = buildLesson({ isMandatory: true, completionCriteria: {} });

    expect(lesson.isCompletedBy({ watchedPercent: null, opened: true })).toBe(true);
    expect(lesson.isCompletedBy({ watchedPercent: 100, opened: false })).toBe(false);
  });
});

