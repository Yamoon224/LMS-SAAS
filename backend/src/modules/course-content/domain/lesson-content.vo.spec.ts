import { LessonContent } from "./lesson-content.vo";

describe("LessonContent value object (BE-09)", () => {
  it("sanitizes raw HTML on creation", () => {
    const content = LessonContent.create("<p>Bonjour</p><script>alert(1)</script>");

    expect(content.html).toContain("Bonjour");
    expect(content.html).not.toContain("script");
    expect(content.toString()).toBe(content.html);
  });

  it("keeps already-clean persisted HTML untouched", () => {
    const content = LessonContent.fromPersistence("<p>Déjà propre</p>");

    expect(content.html).toBe("<p>Déjà propre</p>");
    expect(`${content}`).toBe("<p>Déjà propre</p>");
  });
});
