import "server-only";

import { cache } from "react";
import { z } from "zod";

import { parseHexColor } from "./branding";

import { API_URL, getResolvedTenantSlug, tenantDisplayName, tenantHeaders } from "@/lib/tenant";
import { safeUrl } from "@/lib/url";

const tenantProfileSchema = z.object({
  name: z.string(),
  slug: z.string(),
  branding: z
    .object({
      logoUrl: z.string().nullable().optional(),
      primaryColor: z.string().nullable().optional(),
      bannerUrl: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
    .optional(),
  offlinePaymentEnabled: z.boolean().optional(),
  offlinePaymentInstructions: z.string().nullable().optional(),
});

export interface TenantProfile {
  name: string;
  slug: string | undefined;
  logoUrl: string | null;
  primaryColor: string | null;
  /** PUB-01 : bannière et présentation de l'entreprise (page d'accueil). */
  bannerUrl: string | null;
  description: string | null;
  /** Instructions de paiement hors plateforme (null si désactivé ou absent) — texte brut, jamais du HTML. */
  offlinePaymentInstructions: string | null;
  /** true si les données viennent de GET /public/tenant (sinon repli déduit du slug). */
  fromApi: boolean;
}

/** Champs de charte exposés (URL validées, couleur hexadécimale valide, présentation en texte brut). */
function brandingFields(branding: z.infer<typeof tenantProfileSchema>["branding"]) {
  return {
    logoUrl: safeUrl(branding?.logoUrl),
    primaryColor: parseHexColor(branding?.primaryColor) ? (branding?.primaryColor ?? null) : null,
    bannerUrl: safeUrl(branding?.bannerUrl),
    description: branding?.description?.trim() || null,
  };
}

/**
 * Profil public du tenant. Mis en cache 5 min côté Next (clé = URL + en-têtes,
 * donc par tenant) et dédupliqué par requête ; en cas d'échec de l'API, repli
 * sur un nom déduit du slug sans charte (la page reste utilisable).
 */
export const getTenantProfile = cache(async (): Promise<TenantProfile> => {
  const slug = await getResolvedTenantSlug();
  const fallback: TenantProfile = {
    name: tenantDisplayName(slug),
    slug,
    logoUrl: null,
    primaryColor: null,
    bannerUrl: null,
    description: null,
    offlinePaymentInstructions: null,
    fromApi: false,
  };
  if (!slug) return fallback;

  try {
    const response = await fetch(`${API_URL}/public/tenant`, {
      headers: { Accept: "application/json", ...tenantHeaders(slug) },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return fallback;
    const parsed = tenantProfileSchema.safeParse(await response.json());
    if (!parsed.success) return fallback;
    const { name, branding, offlinePaymentEnabled, offlinePaymentInstructions } = parsed.data;
    return {
      name: name || fallback.name,
      slug,
      ...brandingFields(branding),
      offlinePaymentInstructions: offlinePaymentEnabled ? (offlinePaymentInstructions?.trim().slice(0, 2000) || null) : null,
      fromApi: true,
    };
  } catch {
    return fallback;
  }
});
