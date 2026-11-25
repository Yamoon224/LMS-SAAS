import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getContentLocale,
  resetContentLocaleStore,
  setContentLocale,
  subscribeContentLocale,
} from "./content-locale-store";

/** localStorage minimal en environnement Node : le magasin n'utilise que getItem, setItem et removeItem. */
class FakeStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

let storage: FakeStorage;

beforeEach(() => {
  resetContentLocaleStore();
  storage = new FakeStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("content-locale-store", () => {
  it("renvoie la langue d'origine (vide) par défaut", () => {
    expect(getContentLocale("e1")).toBe("");
  });

  it("mémorise le choix par inscription et le retrouve après rechargement", () => {
    setContentLocale("e1", "en");
    expect(getContentLocale("e1")).toBe("en");
    expect(getContentLocale("e2")).toBe("");
    resetContentLocaleStore(); // simule un rechargement : seule la persistance reste
    expect(getContentLocale("e1")).toBe("en");
  });

  it("revenir à la langue d'origine efface la préférence", () => {
    setContentLocale("e1", "en");
    setContentLocale("e1", "");
    resetContentLocaleStore();
    expect(getContentLocale("e1")).toBe("");
  });

  it("prévient les abonnés d'un changement, et plus après désabonnement", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeContentLocale(listener);
    setContentLocale("e1", "ar");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setContentLocale("e1", "en");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignore une valeur invalide : rien n'est stocké et on reste dans la langue d'origine", () => {
    setContentLocale("e1", "fr; DROP TABLE");
    expect(getContentLocale("e1")).toBe("");
    expect(storage.getItem("learning:content-locale:e1")).toBeNull();
  });

  it("ne fait pas confiance à une valeur corrompue déjà présente dans le stockage", () => {
    storage.setItem("learning:content-locale:e1", "<script>alert(1)</script>");
    expect(getContentLocale("e1")).toBe("");
  });

  it("garde le choix en mémoire quand le stockage est indisponible, sans lever d'erreur", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => setContentLocale("e1", "en")).not.toThrow();
    expect(getContentLocale("e1")).toBe("en");
  });
});
