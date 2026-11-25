/**
 * Client HTTP typé vers l'API backend, via le proxy Next.js
 * (/api/backend/[...path], voir app/api/backend) qui attache le jeton JWT
 * depuis le cookie httpOnly côté serveur. Les composants client ne
 * manipulent donc jamais le jeton directement (pas de localStorage ni de
 * cookie lisible en JS — section 11 "Sécurité").
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Code métier du backend (ex. EMAIL_DEJA_UTILISE), si fourni. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
}

function isUnauthorizedRedirectEnabled(): boolean {
  // Évite de rediriger en boucle si l'appel vient déjà de la page de connexion.
  return typeof window !== "undefined" && window.location.pathname !== "/login";
}

async function request<TResponse>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<TResponse> {
  const response = await fetch(`/api/backend${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    if (isUnauthorizedRedirectEnabled()) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expirée, veuillez vous reconnecter.");
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[]; code?: string };
      code = parsed.code;
      message = Array.isArray(parsed.message)
        ? parsed.message.join(" ")
        : (parsed.message ?? text);
    } catch {
      // réponse non-JSON, on garde le texte brut
    }
    throw new ApiError(response.status, message || `Erreur API ${response.status}`, code);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>("GET", path, undefined, options),
  post: <TResponse, TBody = unknown>(path: string, body?: TBody, options?: RequestOptions) =>
    request<TResponse>("POST", path, body, options),
  put: <TResponse, TBody = unknown>(path: string, body?: TBody, options?: RequestOptions) =>
    request<TResponse>("PUT", path, body, options),
  patch: <TResponse, TBody = unknown>(path: string, body?: TBody, options?: RequestOptions) =>
    request<TResponse>("PATCH", path, body, options),
  delete: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>("DELETE", path, undefined, options),
};
