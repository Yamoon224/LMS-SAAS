import "server-only";

import { headers } from "next/headers";

import { resolveOrigin } from "./site-url";

/** Origine publique de la requête courante (host du sous-domaine du tenant), ou `null` si indéterminée. */
export async function getSiteOrigin(): Promise<string | null> {
  const requestHeaders = await headers();
  return resolveOrigin({
    host: requestHeaders.get("host"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    production: process.env.NODE_ENV === "production",
  });
}
