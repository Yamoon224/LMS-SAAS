import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPosition,
  computeResumeTime,
  preloadMode,
  readPosition,
  RESUME_END_MARGIN_SECONDS,
  RESUME_MIN_SECONDS,
  writePosition,
} from "./resume-position";

describe("computeResumeTime", () => {
  const base = { localSeconds: null, serverPercent: 0, duration: 600 };

  it("reprend à la position locale quand elle existe", () => {
    expect(computeResumeTime({ ...base, localSeconds: 245.7, serverPercent: 80 })).toBe(245);
  });

  it("à défaut, reprend au pourcentage maximum du serveur", () => {
    expect(computeResumeTime({ ...base, serverPercent: 50 })).toBe(300);
  });

  it("repart du début quand la position est trop proche du début", () => {
    expect(computeResumeTime({ ...base, localSeconds: RESUME_MIN_SECONDS - 1 })).toBe(0);
    expect(computeResumeTime({ ...base, serverPercent: 0 })).toBe(0);
  });

  it("repart du début quand la vidéo était terminée", () => {
    expect(computeResumeTime({ ...base, localSeconds: 600 - RESUME_END_MARGIN_SECONDS + 1 })).toBe(0);
    expect(computeResumeTime({ ...base, localSeconds: 600 })).toBe(0);
  });

  it("repart du début pour une vidéo vue en entier (100 %)", () => {
    expect(computeResumeTime({ ...base, serverPercent: 100 })).toBe(0);
  });

  it("plafonne à 95 % une vidéo presque vue : on ne reprend pas sur la toute fin", () => {
    expect(computeResumeTime({ localSeconds: null, serverPercent: 99, duration: 6000 })).toBe(5700);
    expect(computeResumeTime({ localSeconds: null, serverPercent: 97, duration: 6000 })).toBe(5700);
  });

  it("ne reprend jamais sans durée connue", () => {
    for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(computeResumeTime({ localSeconds: 100, serverPercent: 50, duration })).toBe(0);
    }
  });

  it("ignore une position locale invalide et retombe sur le serveur", () => {
    expect(computeResumeTime({ ...base, localSeconds: Number.NaN, serverPercent: 50 })).toBe(300);
    expect(computeResumeTime({ ...base, localSeconds: -20, serverPercent: 50 })).toBe(300);
  });

  it("borne un pourcentage serveur hors limites", () => {
    expect(computeResumeTime({ ...base, serverPercent: -30 })).toBe(0);
    expect(computeResumeTime({ ...base, serverPercent: 5000 })).toBe(0);
  });
});

describe("preloadMode", () => {
  it("ne précharge rien en mode économie de données, seulement les métadonnées sinon", () => {
    expect(preloadMode(true)).toBe("none");
    expect(preloadMode(false)).toBe("metadata");
  });
});

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

describe("stockage de la position", () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("écrit, relit (arrondi à la seconde) puis efface", () => {
    writePosition("e1:l1", 123.9);
    expect(readPosition("e1:l1")).toBe(123);
    clearPosition("e1:l1");
    expect(readPosition("e1:l1")).toBeNull();
  });

  it("sépare les positions par inscription et par leçon", () => {
    writePosition("e1:l1", 10);
    writePosition("e1:l2", 20);
    expect(readPosition("e1:l1")).toBe(10);
    expect(readPosition("e2:l1")).toBeNull();
  });

  it("refuse une clé qui ne ressemble pas à `inscription:leçon`", () => {
    for (const key of ["", "e1", "e1:", "../x:l1", "e1:l1:extra", "e 1:l1"]) {
      writePosition(key, 50);
      expect(readPosition(key)).toBeNull();
    }
  });

  it("refuse d'écrire une position invalide", () => {
    writePosition("e1:l1", Number.NaN);
    writePosition("e1:l1", -5);
    expect(readPosition("e1:l1")).toBeNull();
  });

  it("ne fait pas confiance à une valeur corrompue du stockage", () => {
    storage.setItem("learning:playback:e1:l1", "<script>alert(1)</script>");
    expect(readPosition("e1:l1")).toBeNull();
  });

  it("ne lève jamais d'erreur quand le stockage est indisponible", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => writePosition("e1:l1", 50)).not.toThrow();
    expect(readPosition("e1:l1")).toBeNull();
    expect(() => clearPosition("e1:l1")).not.toThrow();
  });
});
