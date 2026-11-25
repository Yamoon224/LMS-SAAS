import type { UserType } from "@shared/domain/user-type";

/** Contenu signé dans le JWT d'accès (section 3.2: "le jeton JWT contient le tenant_id"). */
export interface JwtAccessPayload {
  sub: string; // userId
  tenantId: string | null;
  type: UserType;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
