import { DomainError } from "@shared/errors/domain-error";

/** Règles pures des paramètres de l'entreprise (ENT-08 identité/contacts/légal, ENT-11 reversement, ENT-12 hors plateforme). */

export class InvalidTenantSettingsError extends DomainError {
  readonly code = "PARAMETRES_INVALIDES";
}

export class PayoutAccountNotVerifiedError extends DomainError {
  readonly code = "COMPTE_REVERSEMENT_NON_VERIFIE";
}

export const MOBILE_MONEY_OPERATORS = ["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE"] as const;
export type MobileMoneyOperator = (typeof MOBILE_MONEY_OPERATORS)[number];

export const OFFLINE_INSTRUCTIONS_MAX_LENGTH = 2000;

const HEX_COLOR_6 = /^#[0-9a-fA-F]{6}$/;

/** Retire balises HTML, chevrons et caractères de contrôle ; conserve les retours à la ligne si `multiline`. */
export function sanitizePlainText(value: string, multiline = false): string {
  const withoutTags = value.replace(/<[^>]*>?/g, "").replace(/[<>]/g, "");
  // eslint-disable-next-line no-control-regex
  const control = multiline ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return withoutTags.replace(control, "").replace(/\r\n?/g, "\n").trim();
}

export function normalizeText(value: unknown, label: string, maxLength: number, options: { required?: boolean; multiline?: boolean } = {}): string | null {
  if (value === undefined || value === null || value === "") {
    if (options.required) throw new InvalidTenantSettingsError(`${label} est obligatoire.`);
    return null;
  }
  if (typeof value !== "string") throw new InvalidTenantSettingsError(`${label} doit être un texte.`);
  const clean = sanitizePlainText(value, options.multiline);
  if (!clean) {
    if (options.required) throw new InvalidTenantSettingsError(`${label} est obligatoire.`);
    return null;
  }
  if (clean.length > maxLength) throw new InvalidTenantSettingsError(`${label} ne peut pas dépasser ${maxLength} caractères.`);
  return clean;
}

/** Couleur `#RRGGBB` uniquement (3/4/8 chiffres refusés : le front les utilise telles quelles dans du CSS). */
export function normalizeHexColor(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !HEX_COLOR_6.test(value.trim())) {
    throw new InvalidTenantSettingsError(`${label} doit être une couleur au format #RRGGBB.`);
  }
  return value.trim().toUpperCase();
}

/** Logo : URL `https` uniquement (ni `http:`, ni `javascript:`, ni `data:`), sans identifiants intégrés. */
export function normalizeHttpsUrl(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new InvalidTenantSettingsError(`${label} doit être une URL.`);
  const trimmed = value.trim();
  if (trimmed.length > 500) throw new InvalidTenantSettingsError(`${label} est trop longue.`);
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidTenantSettingsError(`${label} n'est pas une URL valide.`);
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new InvalidTenantSettingsError(`${label} doit être une URL https:// valide.`);
  }
  return url.toString();
}

export function normalizeEmail(value: unknown, label: string): string | null {
  const text = normalizeText(value, label, 254);
  if (text === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) throw new InvalidTenantSettingsError(`${label} n'est pas une adresse e-mail valide.`);
  return text.toLowerCase();
}

/** Numéro de téléphone : `+` optionnel puis 8 à 15 chiffres (espaces, points et tirets tolérés en saisie). */
export function normalizePhone(value: unknown, label: string): string | null {
  const text = normalizeText(value, label, 30);
  if (text === null) return null;
  if (!/^\+?[0-9 .-]+$/.test(text)) throw new InvalidTenantSettingsError(`${label} n'est pas un numéro valide.`);
  const compact = text.replace(/[ .-]/g, "");
  if (!/^\+?[0-9]{8,15}$/.test(compact)) throw new InvalidTenantSettingsError(`${label} doit comporter 8 à 15 chiffres.`);
  return compact;
}

function lettersToDigits(value: string): string {
  // Table RIB : A-I -> 1-9, J-R -> 1-9, S-Z -> 2-9.
  return value.replace(/[A-Z]/g, (char) => {
    const index = char.charCodeAt(0) - 65;
    return String(index < 9 ? index + 1 : index < 18 ? index - 8 : index - 16);
  });
}

function mod97(numeric: string): number {
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder;
}

/** IBAN (ISO 13616) : forme + clé modulo 97. Renvoie l'IBAN compact en majuscules, sinon `null`. */
export function normalizeIban(value: string): string | null {
  const iban = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  return mod97(numeric) === 1 ? iban : null;
}

/** RIB à 23 caractères (5 banque, 5 guichet, 11 compte, 2 clé) avec contrôle de la clé RIB. */
export function normalizeRib(value: string): string | null {
  const rib = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^\d{5}\d{5}[A-Z0-9]{11}\d{2}$/.test(rib)) return null;
  const body = lettersToDigits(rib.slice(0, 21));
  const key = Number(rib.slice(21));
  return mod97(`${body}00`) === (97 - key) % 97 ? rib : null;
}

export interface MobileMoneyPayoutInput {
  type: "MOBILE_MONEY";
  operator: MobileMoneyOperator;
  accountNumber: string;
  accountName: string;
}

export interface BankPayoutInput {
  type: "BANK";
  accountNumber: string;
  accountName: string;
}

export type PayoutAccountInput = MobileMoneyPayoutInput | BankPayoutInput;

export interface ValidatedPayoutAccount {
  type: "MOBILE_MONEY" | "BANK";
  operator: MobileMoneyOperator | null;
  accountName: string;
  /** Numéro normalisé EN CLAIR : à chiffrer avant toute persistance, jamais à renvoyer. */
  accountNumber: string;
}

export function isMobileMoneyOperator(value: unknown): value is MobileMoneyOperator {
  return typeof value === "string" && (MOBILE_MONEY_OPERATORS as readonly string[]).includes(value);
}

export function validatePayoutAccount(input: {
  type?: unknown;
  operator?: unknown;
  accountNumber?: unknown;
  accountName?: unknown;
}): ValidatedPayoutAccount {
  const accountName = normalizeText(input.accountName, "Le titulaire du compte", 120, { required: true }) as string;
  if (typeof input.accountNumber !== "string" || !input.accountNumber.trim()) {
    throw new InvalidTenantSettingsError("Le numéro de compte est obligatoire.");
  }
  if (input.type === "MOBILE_MONEY") {
    if (!isMobileMoneyOperator(input.operator)) {
      throw new InvalidTenantSettingsError(`L'opérateur doit être l'un de : ${MOBILE_MONEY_OPERATORS.join(", ")}.`);
    }
    const number = normalizePhone(input.accountNumber, "Le numéro Mobile Money");
    return { type: "MOBILE_MONEY", operator: input.operator, accountName, accountNumber: number as string };
  }
  if (input.type === "BANK") {
    const iban = normalizeIban(input.accountNumber) ?? normalizeRib(input.accountNumber);
    if (!iban) throw new InvalidTenantSettingsError("L'IBAN ou le RIB saisi est invalide (clé de contrôle incorrecte).");
    return { type: "BANK", operator: null, accountName, accountNumber: iban };
  }
  throw new InvalidTenantSettingsError("Le type de compte doit être MOBILE_MONEY ou BANK.");
}

/** `***1234` : jamais plus de 4 caractères du numéro. */
export function maskAccountNumber(accountNumber: string): string {
  return `***${accountNumber.slice(-4)}`;
}

/** Noms des clés dont la valeur diffère (comparaison profonde simple, JSON) — jamais les valeurs. */
export function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return Object.keys(after).filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
}
