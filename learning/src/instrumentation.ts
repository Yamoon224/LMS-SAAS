import * as Sentry from "@sentry/nextjs";

/** BE-11 : Sentry côté serveur Next.js, activé uniquement si SENTRY_DSN est renseigné. */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    beforeSend(event) {
      if (event.request) {
        event.request.headers = undefined;
        event.request.cookies = undefined;
        event.request.data = undefined;
      }
      event.user = undefined;
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
