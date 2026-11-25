import "server-only";

export interface JwtClaims {
  sub?: string;
  tenantId?: string | null;
  type?: string;
  roles?: string[];
  permissions?: string[];
  exp?: number;
}

/**
 * Décode (SANS vérifier la signature) la charge utile d'un JWT. Usage strictement UX
 * (afficher/masquer des entrées de navigation) : le backend reste l'autorité et revalide
 * le jeton + les permissions à chaque appel.
 */
export function decodeJwtClaims(token: string): JwtClaims | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as JwtClaims;
  } catch {
    return null;
  }
}
