import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { encryptSecret } from "@shared/crypto/secrets-cipher";
import { NotFoundDomainError } from "@shared/errors";
import { DomainError } from "@shared/errors/domain-error";

import { LOGO_STORAGE } from "../domain/logo-storage.port";
import type { LogoStoragePort } from "../domain/logo-storage.port";
import { extractPublicBranding } from "../domain/public-branding";
import {
  changedKeys,
  InvalidTenantSettingsError,
  maskAccountNumber,
  normalizeEmail,
  normalizeHexColor,
  normalizeHttpsUrl,
  normalizePhone,
  normalizeText,
  OFFLINE_INSTRUCTIONS_MAX_LENGTH,
  validatePayoutAccount,
} from "../domain/tenant-settings";
import { TENANT_REPOSITORY } from "../domain/tenant.repository.port";
import type { TenantRepositoryPort, TenantSettingsRecord } from "../domain/tenant.repository.port";
import { TenantSettingsChangedEvent } from "../tenants.events";

export class IncorrectPasswordError extends DomainError {
  readonly code = "MOT_DE_PASSE_INCORRECT";
}

export interface PayoutAccountView {
  type: "MOBILE_MONEY" | "BANK";
  operator: string | null;
  accountName: string;
  /** `***1234` : jamais le numéro en clair. */
  maskedNumber: string;
}

export interface TenantSettingsView {
  displayName: string;
  branding: { logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null };
  contactEmail: string | null;
  contactPhone: string | null;
  legalInfo: { legalName: string | null; registrationNumber: string | null; taxId: string | null; address: string | null };
  offlinePayment: { enabled: boolean; instructions: string | null };
  payoutAccount: PayoutAccountView | null;
  payoutAccountVerified: boolean;
}

const LEGACY_BRANDING_KEYS = new Set(["logo", "primary", "colors"]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Vue sûre du compte de reversement (stocké : `{ type, operator, accountName, last4, encryptedNumber }`). */
export function toPayoutAccountView(stored: unknown): PayoutAccountView | null {
  const record = asRecord(stored);
  if ((record.type !== "MOBILE_MONEY" && record.type !== "BANK") || typeof record.accountName !== "string") return null;
  return {
    type: record.type,
    operator: stringOrNull(record.operator),
    accountName: record.accountName,
    maskedNumber: maskAccountNumber(typeof record.last4 === "string" ? record.last4 : ""),
  };
}

export function toSettingsView(settings: TenantSettingsRecord): TenantSettingsView {
  const branding = asRecord(settings.branding);
  const publicBranding = extractPublicBranding(settings.branding);
  const legal = asRecord(settings.legalInfo);
  let secondaryColor: string | null = null;
  try {
    secondaryColor = normalizeHexColor(branding.secondaryColor, "Couleur secondaire");
  } catch {
    secondaryColor = null;
  }
  return {
    displayName: settings.name,
    branding: { logoUrl: publicBranding.logoUrl, primaryColor: publicBranding.primaryColor, secondaryColor },
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    legalInfo: {
      legalName: stringOrNull(legal.legalName),
      registrationNumber: stringOrNull(legal.registrationNumber),
      taxId: stringOrNull(legal.taxId),
      address: stringOrNull(legal.address),
    },
    offlinePayment: { enabled: settings.offlinePaymentEnabled, instructions: settings.offlinePaymentInstructions },
    payoutAccount: toPayoutAccountView(settings.payoutAccount),
    payoutAccountVerified: settings.payoutAccountVerified && toPayoutAccountView(settings.payoutAccount) !== null,
  };
}

async function loadSettings(repository: TenantRepositoryPort, tenantId: string): Promise<TenantSettingsRecord> {
  const settings = await repository.findSettings(tenantId);
  if (!settings) throw new NotFoundDomainError("Entreprise introuvable.");
  return settings;
}

export interface BrandingInput {
  displayName?: unknown;
  logoUrl?: unknown;
  primaryColor?: unknown;
  secondaryColor?: unknown;
}

export interface ContactsInput {
  contactEmail?: unknown;
  contactPhone?: unknown;
  legalName?: unknown;
  registrationNumber?: unknown;
  taxId?: unknown;
  address?: unknown;
}

export interface OfflinePaymentInput {
  enabled: boolean;
  instructions?: unknown;
}

export interface PayoutAccountChangeInput {
  type?: unknown;
  operator?: unknown;
  accountNumber?: unknown;
  accountName?: unknown;
  currentPassword: string;
}

@Injectable()
export class GetTenantSettingsUseCase {
  constructor(@Inject(TENANT_REPOSITORY) private readonly repository: TenantRepositoryPort) {}

  async execute(tenantId: string): Promise<TenantSettingsView> {
    return toSettingsView(await loadSettings(this.repository, tenantId));
  }
}

/** ENT-08 / ENT-12 : identité visuelle, contacts et informations légales, paiement hors plateforme. */
@Injectable()
export class UpdateTenantSettingsUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly repository: TenantRepositoryPort,
    private readonly events: EventEmitter2,
    @Optional() @Inject(LOGO_STORAGE) private readonly logoStorage?: LogoStoragePort,
  ) {}

  /** Logo : URL https, ou fichier téléversé dans notre propre stockage (qui peut n'être qu'en http en développement). */
  private normalizeLogoUrl(value: unknown): string | null {
    if (typeof value === "string" && this.logoStorage?.isOwnUrl(value.trim())) return value.trim();
    return normalizeHttpsUrl(value, "L'URL du logo");
  }

  async updateBranding(tenantId: string, actorId: string, input: BrandingInput): Promise<TenantSettingsView> {
    const current = await loadSettings(this.repository, tenantId);
    const name = normalizeText(input.displayName, "Le nom d'affichage", 120, { required: true }) as string;
    const next = {
      logoUrl: this.normalizeLogoUrl(input.logoUrl),
      primaryColor: normalizeHexColor(input.primaryColor, "La couleur principale"),
      secondaryColor: normalizeHexColor(input.secondaryColor, "La couleur secondaire"),
    };
    // Les anciennes clés `logo`/`primary`/`colors` sont retirées pour ne pas masquer une valeur effacée.
    const rest = Object.fromEntries(Object.entries(asRecord(current.branding)).filter(([key]) => !LEGACY_BRANDING_KEYS.has(key)));
    const branding = { ...rest, ...next };
    const before = toSettingsView(current);
    const changed = [
      ...(name !== current.name ? ["displayName"] : []),
      ...changedKeys({ ...before.branding }, next),
    ];
    return this.persist(tenantId, actorId, changed, { name, branding });
  }

  async updateContacts(tenantId: string, actorId: string, input: ContactsInput): Promise<TenantSettingsView> {
    const current = await loadSettings(this.repository, tenantId);
    const contactEmail = normalizeEmail(input.contactEmail, "L'e-mail de contact");
    const contactPhone = normalizePhone(input.contactPhone, "Le téléphone de contact");
    const legalInfo = {
      legalName: normalizeText(input.legalName, "La raison sociale", 200),
      registrationNumber: normalizeText(input.registrationNumber, "Le numéro d'immatriculation", 60),
      taxId: normalizeText(input.taxId, "L'identifiant fiscal", 60),
      address: normalizeText(input.address, "L'adresse", 300),
    };
    const before = toSettingsView(current);
    const changed = changedKeys(
      { contactEmail: before.contactEmail, contactPhone: before.contactPhone, ...before.legalInfo },
      { contactEmail, contactPhone, ...legalInfo },
    );
    return this.persist(tenantId, actorId, changed, { contactEmail, contactPhone, legalInfo: { ...asRecord(current.legalInfo), ...legalInfo } });
  }

  async updateOfflinePayment(tenantId: string, actorId: string, input: OfflinePaymentInput): Promise<TenantSettingsView> {
    const current = await loadSettings(this.repository, tenantId);
    const instructions = normalizeText(input.instructions, "Les instructions", OFFLINE_INSTRUCTIONS_MAX_LENGTH, { multiline: true });
    if (input.enabled && !instructions) {
      throw new InvalidTenantSettingsError(
        "Des instructions de paiement sont obligatoires pour activer le paiement hors plateforme.",
      );
    }
    const changed = changedKeys(
      { offlinePaymentEnabled: current.offlinePaymentEnabled, offlinePaymentInstructions: current.offlinePaymentInstructions },
      { offlinePaymentEnabled: input.enabled, offlinePaymentInstructions: instructions },
    );
    return this.persist(tenantId, actorId, changed, { offlinePaymentEnabled: input.enabled, offlinePaymentInstructions: instructions });
  }

  private async persist(
    tenantId: string,
    actorId: string,
    changed: string[],
    patch: Partial<TenantSettingsRecord>,
  ): Promise<TenantSettingsView> {
    if (changed.length > 0) {
      await this.repository.updateSettings(tenantId, patch);
      this.events.emit("tenant.settings-changed", new TenantSettingsChangedEvent(tenantId, actorId, changed));
    }
    return toSettingsView(await loadSettings(this.repository, tenantId));
  }
}

/** ENT-11 : coordonnées de reversement — ré-authentification, chiffrement au repos, remise à « non vérifié ». */
@Injectable()
export class UpdatePayoutAccountUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly repository: TenantRepositoryPort,
    private readonly usersFacade: UsersFacade,
    private readonly events: EventEmitter2,
  ) {}

  async execute(tenantId: string, actorId: string, input: PayoutAccountChangeInput): Promise<TenantSettingsView> {
    const current = await loadSettings(this.repository, tenantId);
    if (!(await this.usersFacade.verifyPassword(actorId, input.currentPassword))) {
      throw new IncorrectPasswordError("Le mot de passe actuel est incorrect.");
    }
    const account = validatePayoutAccount(input);
    await this.repository.updateSettings(tenantId, {
      payoutAccount: {
        type: account.type,
        operator: account.operator,
        accountName: account.accountName,
        last4: account.accountNumber.slice(-4),
        encryptedNumber: encryptSecret(account.accountNumber),
      },
      payoutAccountVerified: false,
    });
    const changed = current.payoutAccountVerified ? ["payoutAccount", "payoutAccountVerified"] : ["payoutAccount"];
    this.events.emit("tenant.settings-changed", new TenantSettingsChangedEvent(tenantId, actorId, changed));
    return toSettingsView(await loadSettings(this.repository, tenantId));
  }
}
