import { NotFoundDomainError } from "@shared/errors";

import { InvalidTenantSettingsError } from "../domain/tenant-settings";
import type { TenantSettingsRecord } from "../domain/tenant.repository.port";

import { GetTenantPayoutAccountUseCase, VerifyTenantPayoutAccountUseCase } from "./payout-account-admin.use-cases";
import { toPayoutAccountView, toSettingsView } from "./tenant-settings.use-cases";

const baseRecord = (over: Partial<TenantSettingsRecord> = {}): TenantSettingsRecord => ({
  name: "Acme",
  branding: null,
  legalInfo: null,
  contactEmail: null,
  contactPhone: null,
  offlinePaymentEnabled: false,
  offlinePaymentInstructions: null,
  payoutAccount: null,
  payoutAccountVerified: false,
  ...over,
});

const storedAccount = { type: "BANK", accountName: "Acme SARL", last4: "9189", encryptedNumber: "enc" };

describe("toPayoutAccountView", () => {
  it("retourne null pour une valeur absente, mal typée ou sans titulaire", () => {
    expect(toPayoutAccountView(null)).toBeNull();
    expect(toPayoutAccountView([])).toBeNull();
    expect(toPayoutAccountView({ type: "CASH", accountName: "x" })).toBeNull();
    expect(toPayoutAccountView({ type: "BANK" })).toBeNull();
  });

  it("masque le numéro et conserve l'opérateur", () => {
    expect(toPayoutAccountView({ type: "MOBILE_MONEY", operator: "WAVE", accountName: "A", last4: "0000" })).toEqual({
      type: "MOBILE_MONEY",
      operator: "WAVE",
      accountName: "A",
      maskedNumber: "***0000",
    });
    expect(toPayoutAccountView(storedAccount)).toMatchObject({ operator: null, maskedNumber: "***9189" });
    expect(toPayoutAccountView({ type: "BANK", accountName: "A" })?.maskedNumber).toBe("***");
  });
});

describe("toSettingsView", () => {
  it("ignore une couleur secondaire invalide et lit les infos légales", () => {
    const view = toSettingsView(
      baseRecord({ branding: { secondaryColor: "pas-une-couleur" }, legalInfo: { legalName: "Acme SARL", taxId: "" } }),
    );
    expect(view.branding.secondaryColor).toBeNull();
    expect(view.legalInfo).toEqual({ legalName: "Acme SARL", registrationNumber: null, taxId: null, address: null });
  });

  it("garde la couleur secondaire valide", () => {
    expect(toSettingsView(baseRecord({ branding: { secondaryColor: "#00ff00" } })).branding.secondaryColor).toBe("#00FF00");
  });

  it("ne déclare pas vérifié un compte absent", () => {
    expect(toSettingsView(baseRecord({ payoutAccountVerified: true })).payoutAccountVerified).toBe(false);
    expect(toSettingsView(baseRecord({ payoutAccount: storedAccount, payoutAccountVerified: true })).payoutAccountVerified).toBe(true);
  });
});

describe("payout-account-admin - branches", () => {
  const repo = (settings: TenantSettingsRecord | null) => ({
    findSettings: jest.fn().mockResolvedValue(settings),
    updateSettings: jest.fn().mockResolvedValue(undefined),
  });

  it("consultation : 404 si entreprise inconnue, non vérifié sans compte", async () => {
    await expect(new GetTenantPayoutAccountUseCase(repo(null) as never).execute("t")).rejects.toBeInstanceOf(NotFoundDomainError);
    const view = await new GetTenantPayoutAccountUseCase(repo(baseRecord({ payoutAccountVerified: true })) as never).execute("t");
    expect(view).toEqual({ account: null, verified: false });
  });

  it("vérification : 404 si entreprise inconnue", async () => {
    const events = { emit: jest.fn() };
    await expect(new VerifyTenantPayoutAccountUseCase(repo(null) as never, events as never).execute("t", "a")).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
  });

  it("vérification : refusée sans compte de reversement", async () => {
    const events = { emit: jest.fn() };
    const r = repo(baseRecord());
    await expect(new VerifyTenantPayoutAccountUseCase(r as never, events as never).execute("t", "a")).rejects.toBeInstanceOf(
      InvalidTenantSettingsError,
    );
    expect(r.updateSettings).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("vérification : idempotente quand le compte est déjà vérifié (aucune écriture ni événement)", async () => {
    const events = { emit: jest.fn() };
    const r = repo(baseRecord({ payoutAccount: storedAccount, payoutAccountVerified: true }));
    const view = await new VerifyTenantPayoutAccountUseCase(r as never, events as never).execute("t", "a");
    expect(view.verified).toBe(true);
    expect(r.updateSettings).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
