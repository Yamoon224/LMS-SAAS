import type { UserType } from "@shared/domain/user-type";

export interface ActivationUrlInput {
  token: string;
  userType: UserType;
  /** Slug du tenant de l'utilisateur ; null pour un compte plateforme. */
  tenantSlug: string | null;
  baseDomain: string;
  /** `https` par défaut ; `http` possible en développement local. */
  protocol?: string;
  /** Suffixe de sous-domaine du back-office entreprise (ex. `-backoffice`). */
  backofficeSuffix: string;
  /** Page de destination sur la surface de l'utilisateur ; `/activate` par défaut (`/reset-password` pour PUB-04). */
  path?: string;
}

/**
 * Lien d'activation propre à la surface de l'utilisateur :
 *  - plateforme (PLATFORM_ADMIN)  -> https://admin.<domaine>/activate
 *  - entreprise (COMPANY_USER)    -> https://<slug>-backoffice.<domaine>/activate
 *  - apprenant (LEARNER)          -> https://<slug>.<domaine>/activate
 * Un compte entreprise/apprenant sans slug connu retombe sur la surface admin (comportement historique).
 */
export function buildActivationUrl(input: ActivationUrlInput): string {
  const protocol = input.protocol ?? "https";
  const query = `token=${encodeURIComponent(input.token)}`;

  let host = `admin.${input.baseDomain}`;
  if (input.tenantSlug) {
    if (input.userType === "COMPANY_USER") host = `${input.tenantSlug}${input.backofficeSuffix}.${input.baseDomain}`;
    else if (input.userType === "LEARNER") host = `${input.tenantSlug}.${input.baseDomain}`;
  }

  return `${protocol}://${host}${input.path ?? "/activate"}?${query}`;
}
