/** Domaine de base des sous-domaines tenants (NEXT_PUBLIC_APP_BASE_DOMAIN, inliné au build). */
export const APP_BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || "votredomaine.com";

export function tenantHost(slug: string): string {
  return `${slug}.${APP_BASE_DOMAIN}`;
}
