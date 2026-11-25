import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { UserType } from "@shared/domain/user-type";

/** Shape of the JWT payload / `req.user` populated by the JWT auth guard. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string | null;
  type: UserType;
  roles: string[];
  permissions: string[];
}

/** Injects the authenticated user into a controller handler: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
