import { UpdateOwnProfileDto } from "./update-own-profile.dto";

describe("UpdateOwnProfileDto", () => {
  it("ne déclare aucun champ sensible (e-mail, statut, rôles, type)", () => {
    const fields = Object.keys(new UpdateOwnProfileDto());
    for (const forbidden of ["email", "status", "roleIds", "roles", "type", "tenantId"]) {
      expect(fields).not.toContain(forbidden);
    }
  });
});
