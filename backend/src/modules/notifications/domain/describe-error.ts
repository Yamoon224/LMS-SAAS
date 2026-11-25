const UNKNOWN = "Erreur inconnue lors de l'envoi.";

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  errors?: unknown;
  name?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function describeInner(errors: unknown, depth: number): string | null {
  if (!Array.isArray(errors) || depth >= 2) return null;
  const inner = errors.map((item) => describeError(item, depth + 1)).filter((text) => text.length > 0);
  return inner.length > 0 ? `(${[...new Set(inner)].join(" | ")})` : null;
}

/**
 * Message lisible pour une erreur d'envoi : certains échecs réseau (SMTP injoignable, IPv4+IPv6)
 * remontent en `AggregateError` au `message` vide, et d'autres portent leur cause dans `code`.
 * On concatène donc message, `code` et messages des erreurs internes.
 */
export function describeError(error: unknown, depth = 0): string {
  if (error === null || error === undefined) return UNKNOWN;
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);

  const candidate = error as ErrorLike;
  const code = nonEmptyString(candidate.code);
  const parts = [
    code ? `[${code}]` : null,
    nonEmptyString(candidate.message),
    describeInner(candidate.errors, depth),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return nonEmptyString(candidate.name) ?? UNKNOWN;
  return parts.join(" ");
}
