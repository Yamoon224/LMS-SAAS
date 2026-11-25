import * as Sentry from "@sentry/nextjs";

/** BE-11 : Sentry navigateur, désactivé sans NEXT_PUBLIC_SENTRY_DSN. Pas de replay, pas de PII. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    beforeSend(event) {
      event.user = undefined;
      if (event.request) event.request.cookies = undefined;
      return event;
    },
    beforeBreadcrumb(crumb) {
      // Les saisies et URLs de requêtes peuvent contenir des données personnelles : on garde seulement la catégorie.
      if (crumb.category === "ui.input") return null;
      if (crumb.data && "url" in crumb.data) crumb.data = { ...crumb.data, url: String(crumb.data.url).split("?")[0] };
      return crumb;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
