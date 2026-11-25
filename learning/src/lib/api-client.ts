/**
 * Client HTTP typé vers le backend via le proxy Next.js (/api/backend/[...path]),
 * qui attache le jeton depuis le cookie httpOnly et le tenant côté serveur.
 * Les composants client ne voient donc jamais le jeton.
 */
import { dictionaries } from "./i18n/dictionaries";
import { LOCALE_COOKIE, resolveLocale } from "./i18n/locales";

/** Langue courante hors React (cookie du sélecteur, sinon langue du navigateur) : sert aux messages d'erreur. */
function currentErrorCopy() {
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
  return dictionaries[
    resolveLocale({ cookie: cookie?.split("=")[1], acceptLanguage: navigator.language })
  ].errors;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Code métier du backend (ex. MOYEN_PAIEMENT_INDISPONIBLE), si présent. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<{ message: string; code?: string }> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { message?: string | string[]; code?: string };
    const message = Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message;
    return { message: message ?? `Erreur ${response.status}`, code: parsed.code };
  } catch {
    return { message: text || `Erreur ${response.status}` };
  }
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    const from = window.location.pathname;
    if (from !== "/login") {
      window.location.href = `/login?from=${encodeURIComponent(from)}`;
    }
    throw new ApiError(401, currentErrorCopy().sessionExpired);
  }

  if (!response.ok) {
    const { message, code } = await readError(response);
    // Sans code métier, l'erreur vient du proxy Next.js (message français technique) : texte localisé à la place.
    const errors = currentErrorCopy();
    const localized = code
      ? message
      : response.status >= 500
        ? errors.serviceDown
        : response.status === 404
          ? errors.loadFailed
          : message;
    throw new ApiError(response.status, localized, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T, B = unknown>(path: string, body?: B) => request<T>("POST", path, body),
};

/** Détail affichable d'une erreur : seulement les messages d'API (jamais une erreur de validation Zod brute). */
export function errorDetail(error: unknown): string | undefined {
  return error instanceof ApiError ? error.message : undefined;
}
