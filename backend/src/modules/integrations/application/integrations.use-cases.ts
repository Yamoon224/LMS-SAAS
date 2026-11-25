import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { decryptSecret, encryptSecret } from "@shared/crypto/secrets-cipher";

import {
  CATALOG,
  configSource,
  InvalidIntegrationConfigError,
  isProvider,
  resolveValues,
  UnknownIntegrationError,
  validateConfig,
} from "../domain/integration-catalog";
import type { ConfigInput, ConfigSource, FieldKind, IntegrationProvider } from "../domain/integration-catalog";
import { INTEGRATION_SETTING_REPOSITORY } from "../domain/integration-setting.repository.port";
import type {
  IntegrationSettingRepositoryPort,
  StoredIntegration,
} from "../domain/integration-setting.repository.port";
import { SMTP_TESTER } from "../domain/smtp-tester.port";
import type { SmtpTesterPort } from "../domain/smtp-tester.port";
import { IntegrationChangedEvent } from "../integrations.events";

const CACHE_TTL_MS = 15_000;

function parseProvider(value: string): IntegrationProvider {
  if (!isProvider(value)) throw new UnknownIntegrationError(`Intégration inconnue : « ${value} ».`);
  return value;
}

/**
 * Valeurs effectives d'une intégration (base déchiffrée > environnement > défaut), avec un cache court pour ne
 * pas lire la base à chaque e-mail. Le cache est local au processus : avec plusieurs instances, une modification
 * peut mettre jusqu'à 15 s à être vue partout.
 */
@Injectable()
export class ResolveIntegrationUseCase {
  private readonly logger = new Logger(ResolveIntegrationUseCase.name);
  private readonly cache = new Map<string, { at: number; values: Record<string, string> }>();

  constructor(@Inject(INTEGRATION_SETTING_REPOSITORY) private readonly repository: IntegrationSettingRepositoryPort) {}

  async execute(providerName: string): Promise<Record<string, string>> {
    const provider = parseProvider(providerName);
    const cached = this.cache.get(provider);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return { ...cached.values };

    const stored = await this.repository.find(provider);
    const values = resolveValues(provider, this.readStored(stored));
    this.cache.set(provider, { at: Date.now(), values });
    return { ...values };
  }

  invalidate(provider: string): void {
    this.cache.delete(provider);
  }

  /** Secrets déchiffrés + valeurs claires. Un secret illisible (clé maître changée) est ignoré : repli sur l'environnement. */
  private readStored(stored: StoredIntegration | null): Record<string, string> {
    if (!stored) return {};
    const merged: Record<string, string> = { ...stored.values };
    for (const [key, cipherText] of Object.entries(stored.secrets)) {
      try {
        merged[key] = decryptSecret(cipherText);
      } catch {
        this.logger.error(`Secret « ${key} » de ${stored.provider} illisible : repli sur l'environnement.`);
      }
    }
    return merged;
  }
}

export interface IntegrationFieldView {
  key: string;
  label: string;
  kind: FieldKind;
  secret: boolean;
  required: boolean;
  /** Valeur enregistrée dans l'Admin (champs non secrets uniquement ; jamais un secret). */
  value: string | null;
  /** Secret : une valeur existe (Admin ou environnement). Champ clair : une valeur effective existe. */
  configured: boolean;
}

export interface IntegrationView {
  provider: IntegrationProvider;
  label: string;
  description: string;
  source: ConfigSource;
  updatedAt: Date | null;
  fields: IntegrationFieldView[];
}

@Injectable()
export class ListIntegrationsUseCase {
  constructor(@Inject(INTEGRATION_SETTING_REPOSITORY) private readonly repository: IntegrationSettingRepositoryPort) {}

  async execute(): Promise<IntegrationView[]> {
    const rows = new Map((await this.repository.findAll()).map((row) => [row.provider, row]));
    return CATALOG.map((definition) => {
      const stored = rows.get(definition.provider);
      const storedKeys = new Set([...Object.keys(stored?.values ?? {}), ...Object.keys(stored?.secrets ?? {})]);
      return {
        provider: definition.provider,
        label: definition.label,
        description: definition.description,
        source: configSource(definition.provider, storedKeys),
        updatedAt: stored?.updatedAt ?? null,
        fields: definition.fields.map((field) => ({
          key: field.key,
          label: field.label,
          kind: field.kind,
          secret: field.secret,
          required: field.required,
          // Liste blanche : la valeur claire n'est lue que pour un champ déclaré non secret.
          value: field.secret ? null : (stored?.values[field.key] ?? null),
          configured: field.secret
            ? field.key in (stored?.secrets ?? {}) || Boolean(process.env[field.envVar])
            : Boolean(stored?.values[field.key] || process.env[field.envVar] || field.defaultValue),
        })),
      };
    });
  }
}

export interface SaveIntegrationInput {
  provider: string;
  values: ConfigInput;
  clearSecrets: string[];
  actorId: string;
}

@Injectable()
export class SaveIntegrationUseCase {
  constructor(
    @Inject(INTEGRATION_SETTING_REPOSITORY) private readonly repository: IntegrationSettingRepositoryPort,
    private readonly resolver: ResolveIntegrationUseCase,
    private readonly events: EventEmitter2,
  ) {}

  async execute(input: SaveIntegrationInput): Promise<void> {
    const provider = parseProvider(input.provider);
    const existing = await this.repository.find(provider);
    const existingSecrets = existing?.secrets ?? {};

    const validated = validateConfig(provider, input.values, input.clearSecrets, new Set(Object.keys(existingSecrets)));

    if (Object.keys(validated.newSecrets).length > 0 && !process.env.SECRETS_ENCRYPTION_KEY) {
      throw new InvalidIntegrationConfigError([
        "SECRETS_ENCRYPTION_KEY n'est pas configurée sur le serveur : impossible d'enregistrer un secret de façon chiffrée.",
      ]);
    }

    const secrets: Record<string, string> = { ...existingSecrets };
    for (const key of validated.clearedSecrets) delete secrets[key];
    for (const [key, plain] of Object.entries(validated.newSecrets)) secrets[key] = encryptSecret(plain);

    await this.repository.save({ provider, values: validated.values, secrets, updatedBy: input.actorId });
    this.resolver.invalidate(provider);

    const changed = [...Object.keys(validated.values), ...Object.keys(validated.newSecrets), ...validated.clearedSecrets];
    this.events.emit("integration.changed", new IntegrationChangedEvent(provider, input.actorId, "UPDATED", changed));
  }
}

/** Supprime la configuration saisie : la plateforme revient aux variables d'environnement. */
@Injectable()
export class ResetIntegrationUseCase {
  constructor(
    @Inject(INTEGRATION_SETTING_REPOSITORY) private readonly repository: IntegrationSettingRepositoryPort,
    private readonly resolver: ResolveIntegrationUseCase,
    private readonly events: EventEmitter2,
  ) {}

  async execute(providerName: string, actorId: string): Promise<void> {
    const provider = parseProvider(providerName);
    await this.repository.delete(provider);
    this.resolver.invalidate(provider);
    this.events.emit("integration.changed", new IntegrationChangedEvent(provider, actorId, "RESET", []));
  }
}

/** Envoie un e-mail d'essai avec la configuration SMTP EFFECTIVE (enregistrée, sinon environnement). */
@Injectable()
export class TestSmtpIntegrationUseCase {
  constructor(
    private readonly resolver: ResolveIntegrationUseCase,
    @Inject(SMTP_TESTER) private readonly tester: SmtpTesterPort,
  ) {}

  async execute(to: string): Promise<void> {
    const values = await this.resolver.execute("EMAIL_SMTP");
    if (!values.host || !values.fromAddress) {
      throw new InvalidIntegrationConfigError([
        "Le serveur SMTP et l'adresse d'expédition doivent d'abord être renseignés.",
      ]);
    }
    try {
      await this.tester.sendTest(
        {
          host: values.host,
          port: Number(values.port),
          secure: values.secure === "true",
          user: values.user ?? "",
          password: values.password ?? "",
          fromAddress: values.fromAddress,
        },
        to,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "erreur inconnue";
      throw new InvalidIntegrationConfigError([`L'envoi d'essai a échoué : ${reason}`]);
    }
  }
}
