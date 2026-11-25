import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permet de construire dans un autre dossier (NEXT_DIST_DIR=.next-build) sans écraser un `next dev` en cours.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Image Docker uniquement (NEXT_OUTPUT=standalone) : sortie autonome tracée depuis la racine du monorepo.
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const, outputFileTracingRoot: path.join(__dirname, "..") }
    : {}),
};

export default nextConfig;
