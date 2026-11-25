import type { ArgumentsHost } from "@nestjs/common";
import { Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { DomainError } from "@shared/errors/domain-error";
import { captureException } from "@shared/observability/sentry";
import type { Request } from "express";

/** Faut-il remonter cette exception à Sentry ? Jamais les erreurs de domaine ni les HttpException 4xx. */
export function shouldReportToSentry(exception: unknown): boolean {
  if (exception instanceof DomainError) return false;
  if (exception instanceof HttpException) return exception.getStatus() >= 500;
  return true;
}

/**
 * BE-11 : filtre global de repli. Remonte les erreurs inattendues (5xx) à Sentry (si activé), puis délègue à la
 * réponse standard de Nest. N'intercepte pas les DomainError (gérées par DomainErrorFilter, plus spécifique).
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (shouldReportToSentry(exception)) {
      const request = host.switchToHttp().getRequest<Request | undefined>();
      captureException(exception, request ? { method: request.method, url: request.originalUrl } : undefined);
    }
    super.catch(exception, host);
  }
}
