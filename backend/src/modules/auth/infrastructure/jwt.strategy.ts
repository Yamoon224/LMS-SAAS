import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { JwtAccessPayload } from "../application/token.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "change_me_access_secret",
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      type: payload.type,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
