import { PlansFacade } from "@modules/plans/plans.facade";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { QUOTA_KEY } from "@shared/decorators/check-quota.decorator";
import { QuotaExceededError } from "@shared/errors";

interface TenantScopedRequest {
  tenantId?: string;
}

/**
 * Quota guard (BE-03): checked before a creation handler decorated with
 * `@CheckQuota(name)`. Blocks the creation with `QUOTA_DEPASSE` if the
 * tenant's plan limit for that quota is already reached; existing resources
 * remain accessible (RG-03).
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly plansFacade: PlansFacade,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaName = this.reflector.getAllAndOverride<string>(QUOTA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!quotaName) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    if (!request.tenantId) {
      return true;
    }

    const result = await this.plansFacade.checkQuota(request.tenantId, quotaName);
    if (!result.withinLimit) {
      throw new QuotaExceededError(
        `Le quota "${quotaName}" est atteint (${result.current}/${result.limit}). Changez de plan pour continuer.`,
        quotaName,
      );
    }

    return true;
  }
}
