import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Image Docker uniquement (NEXT_OUTPUT=standalone) : sortie autonome tracée depuis la racine du monorepo.
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "..") }
    : {}),
  images: {
    // Les couvertures sont des URLs fournies par les entreprises (stockage objet / CDN).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
