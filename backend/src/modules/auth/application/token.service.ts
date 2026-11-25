import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { AUTH_REPOSITORY } from "../domain/auth.repository.port";
import type { AuthRepositoryPort, AuthUserRecord } from "../domain/auth.repository.port";

import type { JwtAccessPayload, TokenPair } from "./token.types";

/**
 * Émet des paires access/refresh (JWT courts + rafraîchissement révocables,
 * exigence section 11 "Sécurité"). Le refresh token brut n'est jamais stocké
 * — seul son hash SHA-256 l'est, pour pouvoir le révoquer sans le lire.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepositoryPort,
  ) {}

  async issueTokenPair(payload: JwtAccessPayload): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });

    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hash(refreshToken);
    const expiresAt = this.computeRefreshExpiry();

    await this.authRepository.storeRefreshTokenHash(payload.sub, tokenHash, expiresAt);

    return { accessToken, refreshToken };
  }

  /** Émet la paire de jetons d'un compte dont l'identité (mot de passe, puis 2FA le cas échéant) est prouvée. */
  async issueForUser(user: AuthUserRecord): Promise<TokenPair> {
    return this.issueTokenPair({
      sub: user.id,
      tenantId: user.tenantId,
      type: user.type,
      roles: user.roles,
      permissions: user.permissions,
    });
  }

  async rotateRefreshToken(userId: string, refreshToken: string, payload: JwtAccessPayload): Promise<TokenPair> {
    const tokenHash = this.hash(refreshToken);
    const isValid = await this.authRepository.isRefreshTokenValid(userId, tokenHash);
    if (!isValid) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    await this.authRepository.revokeRefreshToken(userId, tokenHash);
    return this.issueTokenPair(payload);
  }

  /**
   * Rafraîchissement silencieux (section 11 "Sécurité"): à partir du seul
   * jeton de rafraîchissement brut (cookie httpOnly), retrouve son
   * propriétaire, révoque ce jeton et en émet une nouvelle paire. Ne
   * suppose jamais la validité d'un jeton d'accès déjà expiré.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(refreshToken);
    const user = await this.authRepository.findByValidRefreshTokenHash(tokenHash);
    if (!user) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    await this.authRepository.revokeRefreshToken(user.id, tokenHash);

    // Un compte suspendu/désactivé ne doit pas pouvoir prolonger sa session via son refresh token.
    if (user.status !== "ACTIVE") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    return this.issueTokenPair({
      sub: user.id,
      tenantId: user.tenantId,
      type: user.type,
      roles: user.roles,
      permissions: user.permissions,
    });
  }

  /**
   * Déconnexion (section 11 "Sécurité"): révoque le jeton de rafraîchissement
   * fourni pour qu'un cookie volé après logout ne permette plus de rafraîchir
   * l'accès. Idempotente — un jeton déjà révoqué, expiré ou inconnu ne
   * provoque pas d'erreur, pour que la déconnexion reste silencieuse du
   * point de vue du client.
   */
  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = this.hash(refreshToken);
    const user = await this.authRepository.findByValidRefreshTokenHash(tokenHash);
    if (!user) return;

    await this.authRepository.revokeRefreshToken(user.id, tokenHash);
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private computeRefreshExpiry(): Date {
    const ttl = process.env.JWT_REFRESH_TTL ?? "7d";
    const days = Number.parseInt(ttl, 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }
}
