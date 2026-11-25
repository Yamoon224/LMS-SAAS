import type { NextFunction, Request, Response } from "express";
import { raw } from "express";

/**
 * Capture le corps brut (Buffer) des requêtes de webhook avant tout parsing
 * JSON, indispensable pour vérifier une signature HMAC calculée par le
 * fournisseur sur les octets exacts envoyés (BE-05). Appliqué uniquement sur
 * le préfixe /v1/payments/webhooks dans main.ts, avant le ValidationPipe
 * global qui s'appuie sur express.json() pour le reste de l'API.
 */
export function rawBodyMiddleware() {
  const rawParser = raw({ type: "*/*", limit: "2mb" });

  return (req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction): void => {
    rawParser(req, res, (err?: unknown) => {
      if (err) {
        next(err as Error);
        return;
      }

      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
        try {
          req.body = req.body.length > 0 ? JSON.parse(req.body.toString("utf8")) : {};
        } catch {
          req.body = {};
        }
      }

      next();
    });
  };
}
