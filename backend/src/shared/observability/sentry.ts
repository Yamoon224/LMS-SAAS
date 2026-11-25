import * as Sentry from "@sentry/node";

/** Clés dont la valeur n'est jamais envoyée à Sentry (mots de passe, jetons, secrets, données personnelles). */
const SENSITIVE_KEY =
  /pass(word)?|pwd|secret|token|authorization|cookie|api[-_]?key|signature|otp|totp|two[-_]?factor|recovery|jwt|refresh|e-?mail|phone|tel|iban|card|cvv|first[-_]?name|last[-_]?name|address/i;
const REDACTED = "[Filtered]";
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;

/** Copie profonde en masquant les clés sensibles et les e-mails / jetons Bearer présents dans les chaînes. */
export function scrub<T>(value: T, depth = 0): T {
  if (depth > 8) return REDACTED as unknown as T;
  if (typeof value === "string") return value.replace(EMAIL, REDACTED).replace(BEARER, `$1 ${REDACTED}`) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrub(item, depth + 1);
    }
    return out as T;
  }
  return value;
}

export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.request) {
    const { method, url } = event.request;
    event.request = { method, url: url ? scrub(url) : url, headers: undefined, cookies: undefined, data: undefined };
    event.request = scrub(event.request);
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.extra) event.extra = scrub(event.extra);
  if (event.contexts) event.contexts = scrub(event.contexts);
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map((crumb) => scrub(crumb));
  return event;
}

let enabled = false;

export function isSentryEnabled(): boolean {
  return enabled;
}

/** BE-11 : initialise Sentry uniquement si SENTRY_DSN est renseigné. À appeler au tout début du bootstrap. */
export function initSentry(env: NodeJS.ProcessEnv = process.env): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? "development",
    release: env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrub(crumb),
  });
  enabled = true;
  return true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext("request", scrub(context));
    Sentry.captureException(error);
  });
}
