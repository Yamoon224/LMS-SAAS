import { describe, expect, it } from "vitest";

import {
  buildCompletionCriteria,
  DEFAULT_WATCHED_PERCENT,
  lessonFormSchema,
  lessonToFormValues,
  toCreatePayload,
  toUpdatePayload,
} from "./lesson.schema";
import { acceptAttribute, acceptsUploadedFile, isMediaSettled, validateMediaFile } from "./media.schema";

const MB = 1024 * 1024;

describe("validateMediaFile (ENT-24)", () => {
  it("accepte un fichier conforme au type de la leçon", () => {
    expect(validateMediaFile({ name: "a.mp4", type: "video/mp4", size: 10 * MB }, "VIDEO")).toBeNull();
    expect(validateMediaFile({ name: "a.pdf", type: "application/pdf", size: 1 * MB }, "PDF")).toBeNull();
    expect(validateMediaFile({ name: "a.csv", type: "text/csv", size: 1024 }, "DOCUMENT")).toBeNull();
  });

  it.each([
    ["application/x-msdownload", "VIDEO"],
    ["application/zip", "DOCUMENT"],
    ["image/svg+xml", "IMAGE"],
    ["text/html", "DOCUMENT"],
    ["audio/mpeg", "VIDEO"],
    ["application/msword", "PDF"],
    ["", "VIDEO"],
  ] as const)("refuse le type MIME %j pour une leçon %s", (type, resourceType) => {
    expect(validateMediaFile({ name: "x", type, size: 1024 }, resourceType)).not.toBeNull();
  });

  it("refuse un fichier trop gros, juste au-dessus du plafond, et accepte pile le plafond", () => {
    expect(validateMediaFile({ name: "a.mp3", type: "audio/mpeg", size: 200 * MB }, "AUDIO")).toBeNull();
    expect(validateMediaFile({ name: "a.mp3", type: "audio/mpeg", size: 200 * MB + 1 }, "AUDIO")).toMatch(/taille maximale/);
    expect(validateMediaFile({ name: "a.png", type: "image/png", size: 10 * MB + 1 }, "IMAGE")).not.toBeNull();
    expect(validateMediaFile({ name: "a.pdf", type: "application/pdf", size: 51 * MB }, "PDF")).not.toBeNull();
  });

  it("refuse un fichier vide, un nom avec séparateur de chemin, et un type de leçon sans fichier", () => {
    expect(validateMediaFile({ name: "a.pdf", type: "application/pdf", size: 0 }, "PDF")).not.toBeNull();
    expect(validateMediaFile({ name: "../a.pdf", type: "application/pdf", size: 5 }, "PDF")).not.toBeNull();
    expect(validateMediaFile({ name: "a", type: "text/plain", size: 5 }, "TEXT")).not.toBeNull();
    expect(validateMediaFile({ name: "a", type: "text/plain", size: 5 }, "LINK")).not.toBeNull();
  });

  it("expose l'attribut accept et les types de leçon concernés", () => {
    expect(acceptAttribute("PDF")).toBe("application/pdf");
    expect(acceptAttribute("VIDEO")).toContain("video/mp4");
    expect(acceptAttribute("TEXT")).toBe("");
    expect(acceptsUploadedFile("AUDIO")).toBe(true);
    expect(acceptsUploadedFile("LINK")).toBe(false);
  });

  it("considère READY, FAILED et REJECTED comme des états stables", () => {
    expect(isMediaSettled("READY")).toBe(true);
    expect(isMediaSettled("PROCESSING")).toBe(false);
    expect(isMediaSettled("SCAN_PENDING")).toBe(false);
  });
});

describe("buildCompletionCriteria (ENT-25)", () => {
  it("applique 90 % par défaut à une vidéo obligatoire", () => {
    expect(buildCompletionCriteria("VIDEO", true, undefined)).toEqual({ watchedPercent: DEFAULT_WATCHED_PERCENT });
    expect(buildCompletionCriteria("AUDIO", true, { watchedPercent: "" })).toEqual({ watchedPercent: 90 });
  });

  it("reprend la valeur saisie et la borne entre 1 et 100", () => {
    expect(buildCompletionCriteria("VIDEO", true, { watchedPercent: 75 })).toEqual({ watchedPercent: 75 });
    expect(buildCompletionCriteria("VIDEO", true, { watchedPercent: "60" })).toEqual({ watchedPercent: 60 });
    expect(buildCompletionCriteria("VIDEO", true, { watchedPercent: 500 })).toEqual({ watchedPercent: 100 });
    expect(buildCompletionCriteria("VIDEO", true, { watchedPercent: 0 })).toEqual({ watchedPercent: 1 });
    expect(buildCompletionCriteria("VIDEO", true, { watchedPercent: "abc" })).toEqual({ watchedPercent: 90 });
  });

  it("n'envoie rien pour un contenu facultatif ou un type sans critère", () => {
    expect(buildCompletionCriteria("VIDEO", false, { watchedPercent: 50 })).toBeUndefined();
    expect(buildCompletionCriteria("TEXT", true, undefined)).toBeUndefined();
    expect(buildCompletionCriteria("LINK", true, undefined)).toBeUndefined();
  });

  it("demande la simple ouverture pour un PDF obligatoire", () => {
    expect(buildCompletionCriteria("PDF", true, undefined)).toEqual({ requiresOpen: true });
    expect(buildCompletionCriteria("DOCUMENT", true, { requiresOpen: false })).toEqual({ requiresOpen: false });
  });
});

describe("charges utiles de leçon (ENT-23 à ENT-25)", () => {
  const base = {
    title: "  Intro  ",
    resourceType: "VIDEO" as const,
    contentHtml: "<p>ignoré</p>",
    storageUrl: "https://ignore.example",
    isMandatory: true,
    completionCriteria: { watchedPercent: 80 },
    downloadAllowed: false,
  };

  it("création : n'envoie ni contenu ni URL pour une vidéo, et le seuil saisi", () => {
    const payload = toCreatePayload(base);
    expect(payload).toMatchObject({ title: "Intro", completionCriteria: { watchedPercent: 80 }, contentHtml: undefined, storageUrl: undefined });
  });

  it("création d'un lien : URL https normalisée, jamais http", () => {
    expect(toCreatePayload({ ...base, resourceType: "LINK", storageUrl: "https://exemple.com" }).storageUrl).toBe("https://exemple.com/");
    expect(toCreatePayload({ ...base, resourceType: "LINK", storageUrl: "http://exemple.com" }).storageUrl).toBeUndefined();
    expect(lessonFormSchema.safeParse({ ...base, resourceType: "LINK", storageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(lessonFormSchema.safeParse({ ...base, resourceType: "LINK", storageUrl: "https://exemple.com" }).success).toBe(true);
  });

  it("modification : ne touche pas au fichier, vide le contenu d'un texte si l'éditeur est vide", () => {
    const update = toUpdatePayload({ ...base, resourceType: "TEXT", contentHtml: "" });
    expect(update.contentHtml).toBe("");
    expect(update).not.toHaveProperty("resourceType");
    expect(toUpdatePayload(base).storageUrl).toBeUndefined();
  });

  it("l'écran reflète le critère existant et retombe sur 90 % sinon", () => {
    const detail = {
      id: "l1", title: "T", order: 0, resourceType: "VIDEO" as const, isMandatory: true,
      completionCriteria: { watchedPercent: 65 }, downloadAllowed: true,
    };
    expect(lessonToFormValues(detail).completionCriteria?.watchedPercent).toBe(65);
    expect(lessonToFormValues({ ...detail, completionCriteria: null }).completionCriteria?.watchedPercent).toBe(90);
  });
});
