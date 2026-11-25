import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpStatus, Logger } from "@nestjs/common";
import {
  ForbiddenActionError,
  InvalidStateTransitionError,
  NotFoundDomainError,
  QuotaExceededError,
  SubscriptionRequiredError,
  TenantMismatchError,
  TenantNotResolvedError,
} from "@shared/errors";
import { DomainError } from "@shared/errors/domain-error";
import type { Response } from "express";

/**
 * Translates typed domain errors into HTTP responses carrying a stable
 * `code` field, so front-end clients can branch on the business reason
 * rather than parsing messages (cahier des charges BE-02, section 13.1).
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  private static readonly STATUS_BY_ERROR = new Map<new (...args: never[]) => DomainError, HttpStatus>([
    [TenantNotResolvedError, HttpStatus.NOT_FOUND],
    [TenantMismatchError, HttpStatus.FORBIDDEN],
    [SubscriptionRequiredError, HttpStatus.PAYMENT_REQUIRED],
    [QuotaExceededError, HttpStatus.FORBIDDEN],
    [ForbiddenActionError, HttpStatus.FORBIDDEN],
    [NotFoundDomainError, HttpStatus.NOT_FOUND],
    [InvalidStateTransitionError, HttpStatus.CONFLICT],
  ]);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorConstructor = exception.constructor as new (...args: never[]) => DomainError;
    const status = DomainErrorFilter.STATUS_BY_ERROR.get(errorConstructor) ?? HttpStatus.BAD_REQUEST;

    this.logger.warn(`${exception.code}: ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }
}
