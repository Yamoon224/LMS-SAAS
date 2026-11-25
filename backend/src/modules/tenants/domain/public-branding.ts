export interface PublicBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  /** PUB-01: bannière de la page d'accueil (URL http(s) ou chemin absolu). */
  bannerUrl: string | null;
  /** PUB-01: présentation courte de l'entreprise (texte brut, 600 caractères au plus). */
  description: string | null;
}

const MAX_DESCRIPTION_LENGTH = 600;

function asDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_DESCRIPTION_LENGTH) : null;
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Une URL de logo n'est exposée que si elle est http(s) ou un chemin absolu (jamais `javascript:` ni `data:`). */
function asSafeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || /^\/(?!\/)/.test(trimmed)) return trimmed;
  return null;
}

function asHexColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : null;
}

/**
 * Extrait défensivement la charte publique du JSON libre `Tenant.branding` (forme non contractuelle :
 * `{ logoUrl }`, `{ logo: "..." }` ou `{ logo: { url } }` ; `{ primaryColor }`, `{ colors: { primary } }`...).
 * Toute forme inconnue ou invalide donne `null` — aucun champ interne n'est jamais relayé.
 */
export function extractPublicBranding(branding: unknown): PublicBranding {
  const root = asRecord(branding);
  if (!root) return { logoUrl: null, primaryColor: null, bannerUrl: null, description: null };

  const logo = asRecord(root.logo);
  const colors = asRecord(root.colors);

  return {
    logoUrl: asSafeUrl(root.logoUrl) ?? asSafeUrl(root.logo) ?? asSafeUrl(logo?.url),
    primaryColor:
      asHexColor(root.primaryColor) ??
      asHexColor(root.primary) ??
      asHexColor(colors?.primary) ??
      asHexColor(colors?.primaryColor),
    bannerUrl: asSafeUrl(root.bannerUrl) ?? asSafeUrl(root.banner) ?? asSafeUrl(asRecord(root.banner)?.url),
    description: asDescription(root.description),
  };
}
