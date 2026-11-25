import { describe, expect, it } from "vitest";

import { dictionaries } from "./dictionaries";
import { fr } from "./dictionaries/fr";
import { LOCALES } from "./locales";

type Node = unknown;

/** Chemins de toutes les feuilles, avec leur nature : texte, fonction ou autre. */
function leaves(node: Node, path = ""): { path: string; kind: "string" | "function" }[] {
  if (typeof node === "string") return [{ path, kind: "string" }];
  if (typeof node === "function") return [{ path, kind: "function" }];
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) => leaves(value, path ? `${path}.${key}` : key));
  }
  return [];
}

const reference = leaves(fr);
const OTHERS = LOCALES.filter((locale) => locale !== "fr");

describe("dictionnaires de l'interface (PUB-15)", () => {
  it("le français est complet et non vide", () => {
    expect(reference.length).toBeGreaterThan(400);
  });

  it.each(OTHERS)("%s : mêmes clés et mêmes natures (texte ou fonction) que le français", (locale) => {
    const actual = leaves(dictionaries[locale]);
    expect(actual.map((leaf) => `${leaf.path}:${leaf.kind}`).sort()).toEqual(
      reference.map((leaf) => `${leaf.path}:${leaf.kind}`).sort(),
    );
  });

  it.each(OTHERS)("%s : n'est plus le gabarit provisoire et traduit l'essentiel", (locale) => {
    expect(dictionaries[locale]).not.toBe(fr);
    const texts = reference.filter((leaf) => leaf.kind === "string").map((leaf) => leaf.path);
    const get = (dictionary: unknown, path: string) =>
      path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dictionary);
    const translated = texts.filter((path) => get(dictionaries[locale], path) !== get(fr, path));
    // Les noms propres et sigles (Wave, MTN MoMo…) restent identiques : on exige au moins 85 % de textes différents.
    expect(translated.length / texts.length).toBeGreaterThan(0.85);
  });

  it.each(OTHERS)("%s : aucun texte vide ni espace superflu", (locale) => {
    for (const leaf of leaves(dictionaries[locale]).filter((entry) => entry.kind === "string")) {
      const value = leaf.path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dictionaries[locale]);
      expect(typeof value === "string" && value.trim().length > 0 && value === value.trim()).toBe(true);
    }
  });

  it.each(OTHERS)("%s : les fonctions renvoient un texte qui contient leurs nombres", (locale) => {
    const dictionary = dictionaries[locale];
    const get = (path: string) =>
      path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dictionary) as (
        ...args: unknown[]
      ) => unknown;
    const withNumbers = ["catalogue.resultCount", "course.accessDays", "quiz.attemptsLeft", "quiz.question"];
    for (const path of withNumbers) {
      const result = get(path)(7, 12);
      expect(typeof result).toBe("string");
      expect(String(result)).toContain("7");
    }
  });
});
