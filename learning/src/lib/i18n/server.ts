import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { dictionaries } from "./dictionaries";
import { isLocale, LOCALE_COOKIE, resolveLocale } from "./locales";
import type { Locale } from "./locales";
import type { Copy } from "./types";

import { API_URL } from "@/lib/tenant";

const languagesSchema = z.array(z.object({ code: z.string() }));

/**
 * Langues activées par la plateforme (GET /public/languages, lecture publique, mise en cache 5 min).
 * En cas d'échec : `undefined` = on suppose toutes les langues disponibles plutôt que de bloquer l'interface.
 */
export const getEnabledLocales = cache(async (): Promise<Locale[] | undefined> => {
  try {
    const response = await fetch(`${API_URL}/public/languages`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return undefined;
    const parsed = languagesSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.map((entry) => entry.code).filter(isLocale) : undefined;
  } catch {
    return undefined;
  }
});

/** Langue de la requête : cookie > Accept-Language > français, limitée aux langues activées. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore, enabled] = await Promise.all([cookies(), headers(), getEnabledLocales()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
    enabled,
  });
});

/** Dictionnaire de la langue de la requête (composants serveur). */
export async function getCopy(): Promise<Copy> {
  return dictionaries[await getLocale()];
}
