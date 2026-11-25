import type { UsersFacade } from "@modules/users/users.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { decryptSecret } from "@shared/crypto/secrets-cipher";

import type { TenantRepositoryPort, TenantSettingsPatch, TenantSettingsRecord } from "../domain/tenant.repository.port";
import { TenantsFacade } from "../tenants.facade";

import { GetTenantPayoutAccountUseCase, VerifyTenantPayoutAccountUseCase } from "./payout-account-admin.use-cases";
import {
  GetTenantSettingsUseCase,
  IncorrectPasswordError,
  UpdatePayoutAccountUseCase,
  UpdateTenantSettingsUseCase,
} from "./tenant-settings.use-cases";

const IBAN = "FR7630006000011234567890189";

function setup() {
  process.env.SECRETS_ENCRYPTION_KEY = "test-master-key";
  const db = new Map<string, TenantSettingsRecord>();
  const base = (name: string): TenantSettingsRecord => ({
    name,
    branding: { logo: "https://old.example.com/l.png", extra: "keep" },
    legalInfo: null,
    contactEmail: null,
    contactPhone: null,
    offlinePaymentEnabled: false,
    offlinePaymentInstructions: null,
    payoutAccount: null,
    payoutAccountVerified: false,
  });
  db.set("t1", base("Acme"));
  db.set("t2", base("Autre"));
  const repository = {
    findSettings: jest.fn(async (id: string) => db.get(id) ?? null),
    updateSettings: jest.fn(async (id: string, patch: TenantSettingsPatch) => {
      const current = db.get(id);
      if (current) db.set(id, { ...current, ...patch });
    }),
  } as unknown as TenantRepositoryPort;
  const events = { emit: jest.fn() } as unknown as EventEmitter2;
  const users = { verifyPassword: jest.fn(async (_id: string, pw: string) => pw === "Secret#123") } as unknown as UsersFacade;
  return {
    db,
    repository,
    events,
    users,
    get: new GetTenantSettingsUseCase(repository),
    update: new UpdateTenantSettingsUseCase(repository, events),
    payout: new UpdatePayoutAccountUseCase(repository, users, events),
    adminGet: new GetTenantPayoutAccountUseCase(repository),
    adminVerify: new VerifyTenantPayoutAccountUseCase(repository, events),
    facade: new TenantsFacade(repository as never),
  };
}

const emitted = (ctx: ReturnType<typeof setup>) => (ctx.events.emit as jest.Mock).mock.calls as Array<[string, { changedFields: string[] }]>;

describe("paramètres de l'entreprise (ENT-08/12)", () => {
  it("identité visuelle : enregistre, retire les anciennes clés, journalise les NOMS des champs", async () => {
    const ctx = setup();
    const view = await ctx.update.updateBranding("t1", "u1", {
      displayName: "Acme <b>Formation</b>",
      logoUrl: "https://cdn.acme.com/logo.png",
      primaryColor: "#1d4ed8",
    });
    expect(view.displayName).toBe("Acme Formation");
    expect(view.branding).toEqual({ logoUrl: "https://cdn.acme.com/logo.png", primaryColor: "#1D4ED8", secondaryColor: null });
    const stored = ctx.db.get("t1")?.branding as Record<string, unknown>;
    expect(stored.logo).toBeUndefined();
    expect(stored.extra).toBe("keep");
    const [name, event] = emitted(ctx)[0] ?? [];
    expect(name).toBe("tenant.settings-changed");
    expect(event?.changedFields).toEqual(expect.arrayContaining(["displayName", "logoUrl", "primaryColor"]));
    expect(JSON.stringify(event)).not.toContain("cdn.acme.com");
  });

  it.each([
    [{ displayName: "A", logoUrl: "http://x.com/l.png" }],
    [{ displayName: "A", logoUrl: "javascript:alert(1)" }],
    [{ displayName: "A", primaryColor: "rouge" }],
    [{ displayName: "<i></i>" }],
  ])("identité visuelle : entrée abusive refusée sans écriture (%j)", async (input) => {
    const ctx = setup();
    await expect(ctx.update.updateBranding("t1", "u1", input)).rejects.toMatchObject({ code: "PARAMETRES_INVALIDES" });
    expect(ctx.repository.updateSettings).not.toHaveBeenCalled();
  });

  it("n'écrit ni n'émet rien quand rien ne change", async () => {
    const ctx = setup();
    await ctx.update.updateContacts("t1", "u1", {});
    expect(ctx.repository.updateSettings).not.toHaveBeenCalled();
    expect(emitted(ctx)).toHaveLength(0);
  });

  it("contacts et légal : valide e-mail/téléphone", async () => {
    const ctx = setup();
    const view = await ctx.update.updateContacts("t1", "u1", { contactEmail: "Contact@Acme.com", contactPhone: "+225 07 00 00 00 00", legalName: "Acme SARL" });
    expect(view.contactEmail).toBe("contact@acme.com");
    expect(view.contactPhone).toBe("+2250700000000");
    expect(view.legalInfo.legalName).toBe("Acme SARL");
    await expect(ctx.update.updateContacts("t1", "u1", { contactEmail: "pas-un-mail" })).rejects.toMatchObject({ code: "PARAMETRES_INVALIDES" });
  });

  it("hors plateforme : assainit le HTML, plafonne à 2000 caractères, exige des instructions pour activer", async () => {
    const ctx = setup();
    const view = await ctx.update.updateOfflinePayment("t1", "u1", { enabled: true, instructions: "Virement <script>x</script>\nRIB : 123" });
    expect(view.offlinePayment).toEqual({ enabled: true, instructions: "Virement x\nRIB : 123" });
    await expect(ctx.update.updateOfflinePayment("t1", "u1", { enabled: true, instructions: "x".repeat(2001) })).rejects.toMatchObject({
      code: "PARAMETRES_INVALIDES",
    });
    await expect(ctx.update.updateOfflinePayment("t1", "u1", { enabled: true, instructions: "<p></p>" })).rejects.toMatchObject({
      code: "PARAMETRES_INVALIDES",
    });
  });

});

describe("isolation des tenants", () => {
  it("isolation : un tenant ne voit ni ne modifie les réglages d'un autre ; tenant inconnu = 404", async () => {
    const ctx = setup();
    await ctx.update.updateBranding("t1", "u1", { displayName: "Nouveau nom" });
    expect(ctx.db.get("t2")?.name).toBe("Autre");
    expect((await ctx.get.execute("t2")).displayName).toBe("Autre");
    await expect(ctx.get.execute("inconnu")).rejects.toMatchObject({ code: expect.any(String), name: "NotFoundDomainError" });
  });
});

describe("coordonnées de reversement (ENT-11)", () => {
  const bank = { type: "BANK", accountNumber: IBAN, accountName: "Acme SARL", currentPassword: "Secret#123" };

  it("mot de passe incorrect : refus, rien n'est écrit", async () => {
    const ctx = setup();
    await expect(ctx.payout.execute("t1", "u1", { ...bank, currentPassword: "faux" })).rejects.toBeInstanceOf(IncorrectPasswordError);
    await expect(ctx.payout.execute("t1", "u1", { ...bank, currentPassword: "" })).rejects.toBeInstanceOf(IncorrectPasswordError);
    expect(ctx.repository.updateSettings).not.toHaveBeenCalled();
  });

  it("IBAN invalide : refus", async () => {
    const ctx = setup();
    await expect(ctx.payout.execute("t1", "u1", { ...bank, accountNumber: "FR7630006000011234567890188" })).rejects.toMatchObject({
      code: "PARAMETRES_INVALIDES",
    });
  });

  it("chiffre le numéro, ne renvoie qu'un masque, remet à non vérifié, journalise sans valeur", async () => {
    const ctx = setup();
    ctx.db.set("t1", { ...(ctx.db.get("t1") as TenantSettingsRecord), payoutAccountVerified: true });
    const view = await ctx.payout.execute("t1", "u1", bank);
    expect(view.payoutAccount).toEqual({ type: "BANK", operator: null, accountName: "Acme SARL", maskedNumber: "***0189" });
    expect(view.payoutAccountVerified).toBe(false);
    expect(JSON.stringify(view)).not.toContain(IBAN);
    const stored = ctx.db.get("t1")?.payoutAccount as { encryptedNumber: string };
    expect(JSON.stringify(stored)).not.toContain(IBAN);
    expect(decryptSecret(stored.encryptedNumber)).toBe(IBAN);
    const event = emitted(ctx)[0]?.[1];
    expect(event?.changedFields).toEqual(["payoutAccount", "payoutAccountVerified"]);
    expect(JSON.stringify(event)).not.toContain("0189");
  });

  it("Mobile Money : opérateur obligatoire et valide", async () => {
    const ctx = setup();
    const mm = { type: "MOBILE_MONEY", operator: "ORANGE_MONEY", accountNumber: "0707070707", accountName: "Acme", currentPassword: "Secret#123" };
    expect((await ctx.payout.execute("t1", "u1", mm)).payoutAccount?.operator).toBe("ORANGE_MONEY");
    await expect(ctx.payout.execute("t1", "u1", { ...mm, operator: undefined })).rejects.toMatchObject({ code: "PARAMETRES_INVALIDES" });
  });

  it("un tenant ne peut pas écrire sur un autre : le tenant visé est celui du jeton (t2 intact)", async () => {
    const ctx = setup();
    await ctx.payout.execute("t1", "u1", bank);
    expect(ctx.db.get("t2")?.payoutAccount).toBeNull();
  });
});

describe("vérification Admin et reversement refusé tant que non vérifié", () => {
  const bank = { type: "BANK", accountNumber: IBAN, accountName: "Acme SARL", currentPassword: "Secret#123" };

  it("reversement refusé sans compte, puis avec compte non vérifié", async () => {
    const ctx = setup();
    await expect(ctx.facade.getVerifiedPayoutDestination("t1")).rejects.toMatchObject({ code: "COMPTE_REVERSEMENT_NON_VERIFIE" });
    await ctx.payout.execute("t1", "u1", bank);
    await expect(ctx.facade.getVerifiedPayoutDestination("t1")).rejects.toMatchObject({ code: "COMPTE_REVERSEMENT_NON_VERIFIE" });
  });

  it("Admin : consultation masquée, vérification, puis destination déchiffrée disponible", async () => {
    const ctx = setup();
    await expect(ctx.adminVerify.execute("t1", "admin")).rejects.toMatchObject({ code: "PARAMETRES_INVALIDES" });
    await ctx.payout.execute("t1", "u1", bank);
    const masked = await ctx.adminGet.execute("t1");
    expect(masked).toEqual({ account: { type: "BANK", operator: null, accountName: "Acme SARL", maskedNumber: "***0189" }, verified: false });
    expect(JSON.stringify(masked)).not.toContain(IBAN);
    expect((await ctx.adminVerify.execute("t1", "admin")).verified).toBe(true);
    expect(emitted(ctx).at(-1)?.[1].changedFields).toEqual(["payoutAccountVerified"]);
    await expect(ctx.facade.getVerifiedPayoutDestination("t1")).resolves.toEqual({ type: "BANK", accountNumber: IBAN, accountName: "Acme SARL" });
  });

  it("modifier le compte après vérification annule la vérification", async () => {
    const ctx = setup();
    await ctx.payout.execute("t1", "u1", bank);
    await ctx.adminVerify.execute("t1", "admin");
    await ctx.payout.execute("t1", "u1", { ...bank, accountName: "Acme 2" });
    await expect(ctx.facade.getVerifiedPayoutDestination("t1")).rejects.toMatchObject({ code: "COMPTE_REVERSEMENT_NON_VERIFIE" });
  });

  it("entreprise inconnue côté Admin = 404", async () => {
    const ctx = setup();
    await expect(ctx.adminGet.execute("x")).rejects.toMatchObject({ name: "NotFoundDomainError" });
  });
});

describe("profil public (ENT-12) : liste blanche", () => {
  async function profileOf(enabled: boolean, instructions: string | null) {
    const { Tenant } = await import("../domain/tenant.entity");
    const { TenantStatus } = await import("../domain/tenant-status");
    const tenant = Tenant.fromPersistence({
      id: "t1", name: "Acme", slug: "acme", status: TenantStatus.ACTIVE, statusReason: null, country: "CI", currency: "XOF",
      defaultLocale: "fr", createdAt: new Date(), offlinePaymentEnabled: enabled, offlinePaymentInstructions: instructions,
    });
    const facade = new TenantsFacade({ findById: async () => tenant } as never);
    return facade.getPublicProfile("t1");
  }

  it("expose les instructions seulement si activé", async () => {
    expect(await profileOf(true, "Virement au RIB X")).toMatchObject({ offlinePaymentEnabled: true, offlinePaymentInstructions: "Virement au RIB X" });
    expect(await profileOf(false, "Virement au RIB X")).toMatchObject({ offlinePaymentEnabled: false, offlinePaymentInstructions: null });
    expect(Object.keys((await profileOf(true, "x")) ?? {}).sort()).toEqual(["branding", "name", "offlinePaymentEnabled", "offlinePaymentInstructions", "slug"]);
  });
});
