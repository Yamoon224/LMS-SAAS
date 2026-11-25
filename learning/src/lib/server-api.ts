import "server-only";

import type { ZodType } from "zod";

import { API_URL, getResolvedTenantSlug, tenantHeaders } from "./tenant";

import { getCopy } from "@/lib/i18n/server";

export type ServerResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

async function extractMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (body.message) return body.message;
  } catch {
    // corps non JSON
  }
  return `Erreur ${response.status}`;
}

/**
 * GET public côté serveur (Server Components) vers le backend, scopé au tenant
 * du sous-domaine. Ne lève jamais : les pages affichent un état d'erreur inline
 * si l'API est injoignable ou répond en erreur.
 */
export async function serverGet<T>(path: string, schema: ZodType<T>): Promise<ServerResult<T>> {
  const copy = await getCopy();
  const slug = await getResolvedTenantSlug();
  if (!slug) {
    return {
      ok: false,
      status: 404,
      message: copy.errors.tenantNotFound,
    };
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json", ...tenantHeaders(slug) },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { ok: false, status: response.status, message: await extractMessage(response) };
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, status: 502, message: copy.errors.loadFailed };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, status: 502, message: copy.errors.serviceDown };
  }
}
