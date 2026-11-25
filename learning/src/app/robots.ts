import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-url";
import { getSiteOrigin } from "@/lib/site-url.server";

/** SEO : catalogue et fiches indexables ; espace connecté, API et pages d'authentification exclus. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses"],
        disallow: [
          "/my-learning",
          "/profile",
          "/certificates",
          "/notifications",
          "/purchases",
          "/verify",
          "/api",
          "/login",
          "/register",
          "/activate",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    ...(origin ? { sitemap: absoluteUrl(origin, "/sitemap.xml"), host: origin } : {}),
  };
}
