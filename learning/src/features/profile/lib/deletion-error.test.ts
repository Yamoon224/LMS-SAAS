import { describe, expect, it } from "vitest";


import { ApiError } from "../../../lib/api-client";
import { dictionaries } from "../../../lib/i18n/dictionaries";
import { LOCALES } from "../../../lib/i18n/locales";

import { deletionErrorMessage } from "./deletion-error";

describe("deletionErrorMessage", () => {
  const copy = dictionaries.fr.myData;

  it("maps business codes to localized messages, never the raw French server message", () => {
    expect(deletionErrorMessage(new ApiError(400, "Mot de passe incorrect.", "MOT_DE_PASSE_INCORRECT"), copy)).toBe(
      copy.wrongPassword,
    );
    expect(deletionErrorMessage(new ApiError(400, "texte serveur", "SUPPRESSION_COMPTE_BLOQUEE"), copy)).toBe(copy.blocked);
  });

  it("handles rate limiting and unknown failures", () => {
    expect(deletionErrorMessage(new ApiError(429, "Too Many Requests"), copy)).toBe(copy.tooManyRequests);
    expect(deletionErrorMessage(new ApiError(500, "boom"), copy)).toBe(copy.deleteFailed);
    expect(deletionErrorMessage(new Error("réseau"), copy)).toBe(copy.deleteFailed);
  });

  it("is available in the eight languages", () => {
    for (const locale of LOCALES) {
      expect(dictionaries[locale].myData.deleteButton.length).toBeGreaterThan(0);
    }
  });
});
