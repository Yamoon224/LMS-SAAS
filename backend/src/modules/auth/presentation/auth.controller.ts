import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "@shared/decorators";
import type { Request } from "express";


import { LoginUseCase } from "../application/login.use-case";
import { TokenService } from "../application/token.service";
import { InvalidCredentialsError } from "../domain/invalid-credentials.error";

import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

/** Module Auth (section 4.1): connexion, JWT accès court + rafraîchissement. */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly tokenService: TokenService,
  ) {}

  /** Anti brute-force: 10 tentatives/minute/IP (le plafond global est de 100). */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @ApiOperation({ summary: "Connexion (e-mail + mot de passe)" })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const tenantId = req.tenantId ?? null;
    return this.loginUseCase.execute({ tenantId, email: dto.email, password: dto.password });
  }

  /**
   * Rafraîchissement silencieux du jeton d'accès à partir du jeton de
   * rafraîchissement (section 11 "Sécurité"). Route publique : c'est le
   * jeton de rafraîchissement lui-même, et non un Bearer, qui prouve
   * l'identité de l'appelant ici.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  @ApiOperation({ summary: "Rafraîchir la paire de jetons à partir du refresh token" })
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.tokenService.refresh(dto.refreshToken);
    } catch {
      throw new InvalidCredentialsError("Jeton de rafraîchissement invalide ou expiré.");
    }
  }

  /**
   * Déconnexion (section 11 "Sécurité"): révoque le jeton de rafraîchissement
   * fourni pour qu'il ne puisse plus servir à obtenir de nouveaux jetons
   * d'accès, même avant son expiration naturelle. Route publique comme
   * /auth/refresh : c'est le jeton de rafraîchissement lui-même qui prouve
   * l'identité de l'appelant. Idempotente : un jeton déjà révoqué ou inconnu
   * ne provoque pas d'erreur.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("logout")
  @ApiOperation({ summary: "Déconnexion : révoque le jeton de rafraîchissement" })
  async logout(@Body() dto: LogoutDto) {
    await this.tokenService.revoke(dto.refreshToken);
    return { loggedOut: true };
  }
}
