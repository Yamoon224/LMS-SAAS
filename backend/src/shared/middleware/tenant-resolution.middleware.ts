import type { NestMiddleware } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { BACKOFFICE_SUFFIX } from "@shared/constants/reserved-slugs";
import type { NextFunction, Request, Response } from "express";


export type RequestSurface = "admin" | "api" | "business" | "learning" | "unknown";

// Global Express.Request augmentation lives in shared/types/express.d.ts
// (single source of truth, loaded reliably regardless of import order).

/**
 * Resolves the tenant slug and the target surface (back-office entreprise vs.
 * plateforme publique) from the `Host` header, per the single-level
 * sub-domain scheme in section 3.3.
 *
 * This middleware only resolves *which* slug was requested; it does not
 * verify the tenant exists or is active — that is the tenant guard's job
 * (BE-01), which can reject with a domain error the DomainErrorFilter maps
 * to HTTP.
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "";
    const hostname = host.split(":")[0] ?? "";
    const baseDomain = process.env.APP_BASE_DOMAIN ?? "";

    if (!baseDomain || !hostname.endsWith(`.${baseDomain}`)) {
      req.requestSurface = hostname.startsWith("api.") ? "api" : "unknown";
      next();
      return;
    }

    const subdomain = hostname.slice(0, -(baseDomain.length + 1));

    if (subdomain === "admin") {
      req.requestSurface = "admin";
    } else if (subdomain === "api") {
      req.requestSurface = "api";
    } else if (subdomain.endsWith(BACKOFFICE_SUFFIX)) {
      req.requestSurface = "business";
      req.tenantSlug = subdomain.slice(0, -BACKOFFICE_SUFFIX.length);
    } else {
      req.requestSurface = "learning";
      req.tenantSlug = subdomain;
    }

    next();
  }
}
