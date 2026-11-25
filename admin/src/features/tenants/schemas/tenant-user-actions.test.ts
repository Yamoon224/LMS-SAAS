import { describe, expect, it } from "vitest";

import { activeOwnersCount, availableUserActions, OWNER_ROLE_NAME } from "./tenant-user-actions";

describe("availableUserActions", () => {
  it("compte actif : suspendre, réinitialiser le mot de passe, transférer la propriété", () => {
    expect(availableUserActions({ status: "ACTIVE", roles: ["Gestionnaire"], twoFactorEnabled: false })).toEqual([
      "suspend",
      "passwordReset",
      "transferOwnership",
    ]);
  });

  it("propriétaire actif avec 2FA : pas de transfert vers lui-même, 2FA réinitialisable", () => {
    expect(availableUserActions({ status: "ACTIVE", roles: [OWNER_ROLE_NAME], twoFactorEnabled: true })).toEqual([
      "suspend",
      "passwordReset",
      "reset2fa",
    ]);
  });

  it("compte suspendu : réactiver ; compte invité : renvoyer l'invitation ; désactivé : rien", () => {
    expect(availableUserActions({ status: "SUSPENDED", roles: [], twoFactorEnabled: false })).toEqual(["reactivate"]);
    expect(availableUserActions({ status: "INVITED", roles: [], twoFactorEnabled: false })).toEqual(["resendInvitation"]);
    expect(availableUserActions({ status: "DEACTIVATED", roles: [], twoFactorEnabled: true })).toEqual([]);
  });
});

describe("activeOwnersCount", () => {
  it("ne compte que les propriétaires actifs", () => {
    expect(
      activeOwnersCount([
        { status: "ACTIVE", roles: [OWNER_ROLE_NAME] },
        { status: "SUSPENDED", roles: [OWNER_ROLE_NAME] },
        { status: "ACTIVE", roles: ["Gestionnaire"] },
      ]),
    ).toBe(1);
  });
});
