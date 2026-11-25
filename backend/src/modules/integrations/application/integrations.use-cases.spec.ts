import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { IntegrationProvider } from "../domain/integration-catalog";
import type {
  IntegrationSettingRepositoryPort,
  StoredIntegration,
} from "../domain/integration-setting.repository.port";
import type { SmtpTesterPort } from "../domain/smtp-tester.port";

import {
  ListIntegrationsUseCase,
  ResetIntegrationUseCase,
  ResolveIntegrationUseCase,
  SaveIntegrationUseCase,
  TestSmtpIntegrationUseCase,
} from "./integrations.use-cases";

class InMemoryRepository implements IntegrationSettingRepositoryPort {
  rows = new Map<string, StoredIntegration>();
  findCalls = 0;

  findAll() {
    return Promise.resolve([...this.rows.values()]);
  }
  find(provider: IntegrationProvider) {
    this.findCalls += 1;
    return Promise.resolve(this.rows.get(provider) ?? null);
  }
  save(data: { provider: IntegrationProvider; values: Record<string, string>; secrets: Record<string, string>; updatedBy: string }) {
    this.rows.set(data.provider, { ...data, updatedAt: new Date() });
    return Promise.resolve();
  }
  delete(provider: IntegrationProvider) {
    this.rows.delete(provider);
    return Promise.resolve();
  }
}

const SMS_VALUES = { apiUrl: "https://sms.example.org/send", senderId: "Acme" };

interface Fixture {
  repository: InMemoryRepository;
  events: { emit: jest.Mock };
  resolver: ResolveIntegrationUseCase;
  save: SaveIntegrationUseCase;
}

/** Enregistre les hooks et renvoie un objet rempli avant chaque test (permet de scinder les describe). */
function useFixture(): Fixture {
  const savedEnv = { ...process.env };
  const ctx = {} as Fixture;

  beforeEach(() => {
    process.env = { ...savedEnv, SECRETS_ENCRYPTION_KEY: "cle-maitre-de-test" };
    for (const key of ["SMS_API_URL", "SMS_API_KEY", "SMS_SENDER_ID", "SMTP_HOST", "SMTP_FROM_ADDRESS"]) delete process.env[key];
    ctx.repository = new InMemoryRepository();
    ctx.events = { emit: jest.fn() };
    ctx.resolver = new ResolveIntegrationUseCase(ctx.repository);
    ctx.save = new SaveIntegrationUseCase(ctx.repository, ctx.resolver, ctx.events as unknown as EventEmitter2);
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  return ctx;
}

describe("enregistrement", () => {
  const ctx = useFixture();
  it("chiffre les secrets : aucune valeur claire n'est stockée", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "cle-tres-secrete" }, clearSecrets: [], actorId: "a1" });
    const row = ctx.repository.rows.get("SMS_GATEWAY");
    expect(row?.secrets.apiKey).toBeDefined();
    expect(JSON.stringify(row)).not.toContain("cle-tres-secrete");
    expect(row?.values).toEqual(SMS_VALUES);
  });

  it("refuse un secret quand la clé maître du serveur manque, sans rien écrire", async () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    await expect(
      ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "k" }, clearSecrets: [], actorId: "a1" }),
    ).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
    expect(ctx.repository.rows.size).toBe(0);
  });

  it("refuse une configuration invalide sans rien écrire ni émettre", async () => {
    await expect(
      ctx.save.execute({ provider: "SMS_GATEWAY", values: { apiUrl: "http://10.0.0.1", apiKey: "k" }, clearSecrets: [], actorId: "a1" }),
    ).rejects.toThrow();
    expect(ctx.repository.rows.size).toBe(0);
    expect(ctx.events.emit).not.toHaveBeenCalled();
  });

  it("refuse un provider inconnu", async () => {
    await expect(ctx.save.execute({ provider: "NOPE", values: {}, clearSecrets: [], actorId: "a1" })).rejects.toThrow(/inconnue/);
  });

  it("un secret non renvoyé est conservé lors d'une nouvelle sauvegarde", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "k1" }, clearSecrets: [], actorId: "a1" });
    const before = ctx.repository.rows.get("SMS_GATEWAY")?.secrets.apiKey;
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, senderId: "Autre" }, clearSecrets: [], actorId: "a1" });
    expect(ctx.repository.rows.get("SMS_GATEWAY")?.secrets.apiKey).toBe(before);
    expect((await ctx.resolver.execute("SMS_GATEWAY")).apiKey).toBe("k1");
  });

  it("émet un événement d'audit qui ne contient AUCUNE valeur, seulement les noms de champs", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "cle-tres-secrete" }, clearSecrets: [], actorId: "a1" });
    const event = ctx.events.emit.mock.calls[0]?.[1] as { provider: string; actorId: string; changedFields: string[] };
    expect(ctx.events.emit.mock.calls[0]?.[0]).toBe("integration.changed");
    expect(event.provider).toBe("SMS_GATEWAY");
    expect(event.actorId).toBe("a1");
    expect(event.changedFields.sort()).toEqual(["apiKey", "apiUrl", "senderId"]);
    expect(JSON.stringify(event)).not.toContain("cle-tres-secrete");
    expect(JSON.stringify(event)).not.toContain("sms.example.org");
  });
});

describe("résolution", () => {
  const ctx = useFixture();
  it("renvoie les secrets déchiffrés, avec l'environnement en repli", async () => {
    process.env.SMS_SENDER_ID = "DepuisEnv";
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { apiUrl: SMS_VALUES.apiUrl, apiKey: "k1" }, clearSecrets: [], actorId: "a1" });
    const values = await ctx.resolver.execute("SMS_GATEWAY");
    expect(values).toMatchObject({ apiUrl: SMS_VALUES.apiUrl, apiKey: "k1", senderId: "DepuisEnv" });
  });

  it("met en cache puis voit une modification immédiatement (invalidation)", async () => {
    await ctx.resolver.execute("SMS_GATEWAY");
    await ctx.resolver.execute("SMS_GATEWAY");
    expect(ctx.repository.findCalls).toBe(1);
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "k1" }, clearSecrets: [], actorId: "a1" });
    expect((await ctx.resolver.execute("SMS_GATEWAY")).senderId).toBe("Acme");
  });

  it("un secret illisible (clé maître changée) ne casse pas : repli sur l'environnement", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "k1" }, clearSecrets: [], actorId: "a1" });
    process.env.SECRETS_ENCRYPTION_KEY = "une-autre-cle";
    process.env.SMS_API_KEY = "cle-env";
    ctx.resolver.invalidate("SMS_GATEWAY");
    expect((await ctx.resolver.execute("SMS_GATEWAY")).apiKey).toBe("cle-env");
  });
});

describe("liste", () => {
  const ctx = useFixture();
  it("ne renvoie jamais un secret, ni en clair ni chiffré", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "cle-tres-secrete" }, clearSecrets: [], actorId: "a1" });
    const list = await new ListIntegrationsUseCase(ctx.repository).execute();
    const sms = list.find((entry) => entry.provider === "SMS_GATEWAY");
    const apiKey = sms?.fields.find((field) => field.key === "apiKey");
    expect(apiKey).toMatchObject({ secret: true, value: null, configured: true });
    expect(JSON.stringify(list)).not.toContain("cle-tres-secrete");
    expect(JSON.stringify(list)).not.toContain(ctx.repository.rows.get("SMS_GATEWAY")?.secrets.apiKey ?? "###");
    expect(sms?.source).toBe("PLATFORM");
  });

  it("liste les quatre intégrations, même sans rien d'enregistré", async () => {
    const list = await new ListIntegrationsUseCase(ctx.repository).execute();
    expect(list.map((entry) => entry.provider)).toEqual(["AI_TRANSLATION", "EMAIL_SMTP", "SMS_GATEWAY", "GOOGLE_CALENDAR"]);
    expect(list.find((entry) => entry.provider === "SMS_GATEWAY")?.source).toBe("NONE");
  });
});

describe("réinitialisation", () => {
  const ctx = useFixture();
  it("supprime la configuration saisie, invalide le cache et journalise", async () => {
    await ctx.save.execute({ provider: "SMS_GATEWAY", values: { ...SMS_VALUES, apiKey: "k1" }, clearSecrets: [], actorId: "a1" });
    await ctx.resolver.execute("SMS_GATEWAY");
    await new ResetIntegrationUseCase(ctx.repository, ctx.resolver, ctx.events as unknown as EventEmitter2).execute("SMS_GATEWAY", "a2");
    expect(ctx.repository.rows.size).toBe(0);
    expect((await ctx.resolver.execute("SMS_GATEWAY")).apiUrl).toBe("");
    expect(ctx.events.emit).toHaveBeenLastCalledWith("integration.changed", expect.objectContaining({ kind: "RESET", actorId: "a2" }));
  });
});

describe("test SMTP", () => {
  const ctx = useFixture();
  const smtpValues = { host: "smtp.example.com", port: 587, fromAddress: "no-reply@example.com" };

  it("envoie avec la configuration effective", async () => {
    await ctx.save.execute({ provider: "EMAIL_SMTP", values: { ...smtpValues, user: "u", password: "mdp" }, clearSecrets: [], actorId: "a1" });
    const tester: SmtpTesterPort = { sendTest: jest.fn().mockResolvedValue(undefined) };
    await new TestSmtpIntegrationUseCase(ctx.resolver, tester).execute("admin@example.com");
    expect(tester.sendTest).toHaveBeenCalledWith(
      { host: "smtp.example.com", port: 587, secure: false, user: "u", password: "mdp", fromAddress: "no-reply@example.com" },
      "admin@example.com",
    );
  });

  it("refuse si SMTP n'est pas renseigné", async () => {
    const tester: SmtpTesterPort = { sendTest: jest.fn() };
    await expect(new TestSmtpIntegrationUseCase(ctx.resolver, tester).execute("a@b.co")).rejects.toThrow(/renseignés/);
    expect(tester.sendTest).not.toHaveBeenCalled();
  });

  it("convertit un échec du relais en erreur lisible sans divulguer le mot de passe", async () => {
    await ctx.save.execute({ provider: "EMAIL_SMTP", values: { ...smtpValues, user: "u", password: "mdp-secret" }, clearSecrets: [], actorId: "a1" });
    const tester: SmtpTesterPort = { sendTest: jest.fn().mockRejectedValue(new Error("535 authentification refusée")) };
    const error = await new TestSmtpIntegrationUseCase(ctx.resolver, tester).execute("a@b.co").catch((cause: Error) => cause);
    expect((error as Error).message).toContain("535 authentification refusée");
    expect((error as Error).message).not.toContain("mdp-secret");
  });
});
