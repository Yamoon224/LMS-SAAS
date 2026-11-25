import { DomainError } from "@shared/errors";

/**
 * ADM-37 : catalogue des intégrations configurables par l'Admin. Fonctions pures (section 13.1), sans accès base.
 * Chaque champ nomme la variable d'environnement qui sert de repli : la configuration saisie dans l'Admin
 * l'emporte, l'environnement reste la valeur de départ et le moyen de configurer un relais interne.
 */
export const INTEGRATION_PROVIDERS = ["AI_TRANSLATION", "EMAIL_SMTP", "SMS_GATEWAY", "GOOGLE_CALENDAR"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type FieldKind = "text" | "url" | "host" | "port" | "boolean" | "email" | "pem";

export interface FieldDefinition {
  key: string;
  label: string;
  kind: FieldKind;
  /** Jamais renvoyé par l'API ni écrit en clair : stocké chiffré. */
  secret: boolean;
  required: boolean;
  envVar: string;
  /** Valeur utilisée quand ni la base ni l'environnement ne fournissent rien. */
  defaultValue?: string;
}

export interface ProviderDefinition {
  provider: IntegrationProvider;
  label: string;
  description: string;
  fields: readonly FieldDefinition[];
}

export const CATALOG: readonly ProviderDefinition[] = [
  {
    provider: "AI_TRANSLATION",
    label: "Fournisseur de traduction IA",
    description: "Service compatible DeepL utilisé pour traduire les formations (PUB-17).",
    fields: [
      {
        key: "apiUrl",
        label: "URL de l'API",
        kind: "url",
        secret: false,
        required: true,
        envVar: "TRANSLATION_API_URL",
        defaultValue: "https://api-free.deepl.com/v2/translate",
      },
      { key: "apiKey", label: "Clé API", kind: "text", secret: true, required: true, envVar: "TRANSLATION_API_KEY" },
    ],
  },
  {
    provider: "EMAIL_SMTP",
    label: "E-mail (SMTP)",
    description: "Relais SMTP pour les e-mails transactionnels (invitations, factures, rappels).",
    fields: [
      { key: "host", label: "Serveur SMTP", kind: "host", secret: false, required: true, envVar: "SMTP_HOST" },
      { key: "port", label: "Port", kind: "port", secret: false, required: true, envVar: "SMTP_PORT", defaultValue: "587" },
      { key: "secure", label: "Connexion TLS directe", kind: "boolean", secret: false, required: false, envVar: "SMTP_SECURE", defaultValue: "false" },
      { key: "user", label: "Identifiant", kind: "text", secret: false, required: false, envVar: "SMTP_USER" },
      { key: "password", label: "Mot de passe", kind: "text", secret: true, required: false, envVar: "SMTP_PASSWORD" },
      { key: "fromAddress", label: "Adresse d'expédition", kind: "email", secret: false, required: true, envVar: "SMTP_FROM_ADDRESS" },
    ],
  },
  {
    provider: "SMS_GATEWAY",
    label: "Passerelle SMS",
    description: "Passerelle HTTP d'envoi de SMS. Sans URL, les SMS ne sont pas envoyés.",
    fields: [
      { key: "apiUrl", label: "URL de l'API", kind: "url", secret: false, required: true, envVar: "SMS_API_URL" },
      { key: "apiKey", label: "Clé API", kind: "text", secret: true, required: true, envVar: "SMS_API_KEY" },
      { key: "senderId", label: "Nom d'expéditeur", kind: "text", secret: false, required: false, envVar: "SMS_SENDER_ID", defaultValue: "SaaSLMS" },
    ],
  },
  {
    provider: "GOOGLE_CALENDAR",
    label: "Google Calendar / Meet",
    description: "Compte de service Google qui crée les événements et les liens Meet des sessions en direct.",
    fields: [
      { key: "serviceAccountEmail", label: "E-mail du compte de service", kind: "email", secret: false, required: true, envVar: "GOOGLE_SERVICE_ACCOUNT_EMAIL" },
      { key: "privateKey", label: "Clé privée", kind: "pem", secret: true, required: true, envVar: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY" },
      { key: "calendarId", label: "Identifiant du calendrier", kind: "text", secret: false, required: false, envVar: "GOOGLE_CALENDAR_ID", defaultValue: "primary" },
    ],
  },
];

export class UnknownIntegrationError extends DomainError {
  readonly code = "INTEGRATION_INCONNUE";
}

export class InvalidIntegrationConfigError extends DomainError {
  readonly code = "INTEGRATION_INVALIDE";
  constructor(public readonly problems: readonly string[]) {
    super(problems.join(" "));
  }
}

export function isProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function getDefinition(provider: string): ProviderDefinition {
  const definition = CATALOG.find((entry) => entry.provider === provider);
  if (!definition) throw new UnknownIntegrationError(`Intégration inconnue : « ${provider} ».`);
  return definition;
}

// ---------------------------------------------------------------------------------------------
// Garde anti-SSRF : une URL saisie dans l'Admin ne doit pas viser le réseau interne du serveur.
// Limite assumée : seul le nom d'hôte écrit est examiné ; un nom DNS public qui résout vers une
// adresse privée n'est pas détecté ici. Un relais interne légitime se configure par l'environnement.
// ---------------------------------------------------------------------------------------------

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!bare.includes(":")) return false;
  if (bare === "::1" || bare === "::") return true;
  if (bare.startsWith("::ffff:")) return true;
  return /^f[cd]/.test(bare) || /^fe[89ab]/.test(bare);
}

/** Renvoie la raison du refus, ou `null` si l'hôte est acceptable. */
export function hostProblem(host: string): string | null {
  const lower = host.trim().toLowerCase().replace(/\.$/, "");
  if (lower === "") return "L'hôte est vide.";
  if (/[\s/@?#]/.test(lower)) return "L'hôte ne doit contenir ni schéma, ni chemin, ni identifiants.";
  const noDot = !lower.includes(".") && !lower.includes(":");
  if (lower === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(lower) || noDot) {
    return "Un hôte local ou interne n'est pas accepté ici.";
  }
  if (isPrivateIpv4(lower) || isPrivateIpv6(lower)) return "Une adresse privée ou réservée n'est pas acceptée ici.";
  return null;
}

/** Renvoie la raison du refus, ou `null` : HTTPS obligatoire, sans identifiants, hôte public. */
export function urlProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "L'URL est invalide.";
  }
  if (url.protocol !== "https:") return "L'URL doit commencer par https://.";
  if (url.username || url.password) return "L'URL ne doit pas contenir d'identifiants.";
  return hostProblem(url.hostname);
}

// ---------------------------------------------------------------------------------------------
// Validation et fusion
// ---------------------------------------------------------------------------------------------

export type ConfigInput = Record<string, string | boolean | number | null | undefined>;

function fieldProblem(field: FieldDefinition, value: string): string | null {
  switch (field.kind) {
    case "url":
      return urlProblem(value);
    case "host":
      return hostProblem(value);
    case "port": {
      const port = Number(value);
      return Number.isInteger(port) && port >= 1 && port <= 65535 ? null : "Le port doit être un entier entre 1 et 65535.";
    }
    case "boolean":
      return value === "true" || value === "false" ? null : "La valeur doit être vrai ou faux.";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "L'adresse e-mail est invalide.";
    case "pem":
      return value.includes("BEGIN PRIVATE KEY") ? null : "La clé privée doit être au format PEM (BEGIN PRIVATE KEY).";
    default:
      return value.length > 2000 ? "La valeur est trop longue." : null;
  }
}

/** Texte saisi → valeur normalisée ; chaîne vide = « non renseigné ». */
function normalize(value: ConfigInput[string]): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export interface ValidatedConfig {
  /** Champs non secrets à enregistrer (clé absente = effacée). */
  values: Record<string, string>;
  /** Secrets nouvellement fournis (en clair, à chiffrer). */
  newSecrets: Record<string, string>;
  /** Secrets à supprimer. */
  clearedSecrets: string[];
}

function missingWithoutFallback(field: FieldDefinition, env: NodeJS.ProcessEnv): boolean {
  return field.required && !normalize(env[field.envVar]) && !field.defaultValue;
}

function collectSecret(
  field: FieldDefinition,
  raw: string,
  clearSecrets: readonly string[],
  storedSecretKeys: ReadonlySet<string>,
  env: NodeJS.ProcessEnv,
  result: ValidatedConfig,
): string[] {
  const problems: string[] = [];
  const cleared = clearSecrets.includes(field.key);
  if (cleared) {
    result.clearedSecrets.push(field.key);
  } else if (raw !== "") {
    const problem = fieldProblem(field, raw);
    if (problem) problems.push(`${field.label} : ${problem}`);
    result.newSecrets[field.key] = raw;
  }
  const willHave = !cleared && (raw !== "" || storedSecretKeys.has(field.key));
  if (!willHave && missingWithoutFallback(field, env)) problems.push(`${field.label} : champ obligatoire.`);
  return problems;
}

function collectPlain(field: FieldDefinition, raw: string, env: NodeJS.ProcessEnv, result: ValidatedConfig): string[] {
  if (raw === "") return missingWithoutFallback(field, env) ? [`${field.label} : champ obligatoire.`] : [];
  const problem = fieldProblem(field, raw);
  result.values[field.key] = raw;
  return problem ? [`${field.label} : ${problem}`] : [];
}

/**
 * Valide une saisie. Règles : un champ inconnu est refusé ; un secret absent ou vide est CONSERVÉ (l'API ne
 * renvoie jamais les secrets, le formulaire ne peut donc pas les renvoyer) ; `clearSecrets` en supprime
 * explicitement ; un champ obligatoire doit être fourni par la saisie, un secret déjà enregistré ou, à défaut,
 * l'environnement ou la valeur par défaut.
 */
export function validateConfig(
  provider: string,
  input: ConfigInput,
  clearSecrets: readonly string[],
  storedSecretKeys: ReadonlySet<string>,
  env: NodeJS.ProcessEnv = process.env,
): ValidatedConfig {
  const definition = getDefinition(provider);
  const problems: string[] = [];
  const known = new Set(definition.fields.map((field) => field.key));
  for (const key of [...Object.keys(input), ...clearSecrets]) {
    if (!known.has(key)) problems.push(`Champ inconnu : « ${key} ».`);
  }

  const result: ValidatedConfig = { values: {}, newSecrets: {}, clearedSecrets: [] };
  for (const field of definition.fields) {
    const raw = normalize(input[field.key]);
    const fieldProblems = field.secret
      ? collectSecret(field, raw, clearSecrets, storedSecretKeys, env, result)
      : collectPlain(field, raw, env, result);
    problems.push(...fieldProblems);
  }

  if (problems.length > 0) throw new InvalidIntegrationConfigError(problems);
  return result;
}

/** Valeurs effectives : base (déchiffrée) > environnement > valeur par défaut. Une valeur vide n'écrase rien. */
export function resolveValues(
  provider: string,
  stored: Readonly<Record<string, string>>,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const field of getDefinition(provider).fields) {
    resolved[field.key] = normalize(stored[field.key]) || normalize(env[field.envVar]) || field.defaultValue || "";
  }
  return resolved;
}

export type ConfigSource = "PLATFORM" | "ENVIRONMENT" | "NONE";

/** D'où vient la configuration effective : saisie Admin, environnement seul, ou rien d'utilisable. */
export function configSource(
  provider: string,
  storedKeys: ReadonlySet<string>,
  env: NodeJS.ProcessEnv = process.env,
): ConfigSource {
  if (storedKeys.size > 0) return "PLATFORM";
  const fields = getDefinition(provider).fields;
  return fields.some((field) => normalize(env[field.envVar]) !== "") ? "ENVIRONMENT" : "NONE";
}
