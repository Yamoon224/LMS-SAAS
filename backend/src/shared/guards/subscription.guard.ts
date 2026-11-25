import { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SKIP_SUBSCRIPTION_CHECK_KEY } from "@shared/decorators/skip-subscription-check.decorator";
import { SubscriptionRequiredError } from "@shared/errors";

interface TenantScopedRequest {
  tenantId?: string;
  requestSurface?: string;
}

/**
 * Subscription guard (BE-02): applied to business/learning routes. Refuses
 * with the `ABONNEMENT_REQUIS` domain error (mapped to HTTP 402 by
 * DomainErrorFilter) unless the tenant's subscription is active, trialing,
 * or within its grace period (RG-01). Routes marked `@SkipSubscriptionCheck()`
 * (profile, subscription & billing itself) bypass this check so the
 * entreprise can always reach the page that lets it fix its subscription
 * (section 6, "Règle fondamentale").
 *
 * Must run after TenantGuard, which populates `request.tenantId`.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsFacade: SubscriptionsFacade,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();

    if (request.requestSurface === "admin" || request.requestSurface === "api") {
      return true;
    }

    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCheck) {
      return true;
    }

    if (!request.tenantId) {
      // TenantGuard should have already rejected the request in this case.
      return true;
    }

    const isOperational = await this.subscriptionsFacade.isTenantOperational(request.tenantId);
    if (!isOperational) {
      throw new SubscriptionRequiredError(
        "Cette fonctionnalité nécessite un abonnement actif, en essai ou en période de grâce.",
      );
    }

    return true;
  }
}
