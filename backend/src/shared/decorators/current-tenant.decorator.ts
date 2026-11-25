import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

/** Injects the resolved tenant id into a controller handler: `@CurrentTenant() tenantId: string`. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ tenantId: string }>();
    return request.tenantId;
  },
);
