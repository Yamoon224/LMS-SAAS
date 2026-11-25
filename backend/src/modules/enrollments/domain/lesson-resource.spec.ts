import { resolveLessonResource } from "./lesson-resource";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("resolveLessonResource", () => {
  it("un UUID désigne un média du tenant", () => {
    expect(resolveLessonResource(UUID, "VIDEO", false)).toEqual({ kind: "MEDIA", mediaAssetId: UUID });
  });

  it("une URL http(s) est une ressource externe", () => {
    expect(resolveLessonResource("https://cdn.example/x.pdf", "PDF", false)).toEqual({
      kind: "EXTERNAL",
      url: "https://cdn.example/x.pdf",
    });
  });

  it("une valeur inconnue, vide ou dangereuse n'est jamais relayée", () => {
    for (const value of [null, "", "  ", "tenants/abc/raw.mp4", "javascript:alert(1)", "ftp://x/y"]) {
      expect(resolveLessonResource(value, "VIDEO", true)).toEqual({ kind: "NONE" });
    }
  });

  it("un contenu TEXT n'a pas de ressource", () => {
    expect(resolveLessonResource(UUID, "TEXT", true)).toEqual({ kind: "NONE" });
  });

  it("un DOCUMENT sans téléchargement autorisé n'expose aucune ressource", () => {
    expect(resolveLessonResource("https://cdn.example/a.docx", "DOCUMENT", false)).toEqual({ kind: "NONE" });
    expect(resolveLessonResource("https://cdn.example/a.docx", "DOCUMENT", true)).toEqual({
      kind: "EXTERNAL",
      url: "https://cdn.example/a.docx",
    });
  });
});
