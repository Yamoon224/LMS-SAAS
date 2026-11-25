import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { PERMISSIONS_KEY } from "@shared/decorators/permissions.decorator";
import { ForbiddenActionError } from "@shared/errors";

/** Enforces the permission codes declared via `@RequirePermissions(...)` against the caller's roles. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const userPermissions = new Set(request.user?.permissions ?? []);
    const hasAll = requiredPermissions.every((permission) => userPermissions.has(permission));

    if (!hasAll) {
      throw new ForbiddenActionError(
        `Permission(s) manquante(s): ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
