import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Injectable } from "@nestjs/common";

import type { LogoStoragePort } from "../domain/logo-storage.port";

/** Dossier des logos sur disque (à monter sur un volume persistant en production). */
export function logoStorageDir(): string {
  return process.env.LOGO_STORAGE_DIR ?? join(process.cwd(), "uploads", "logos");
}

/** Route publique servie par `main.ts` (fichiers statiques) : ne dépend que du préfixe d'API. */
export function logoRoutePath(): string {
  return `/${process.env.API_PREFIX ?? "v1"}/assets/logos`;
}

/** Préfixe d'URL publique des logos : `PUBLIC_ASSETS_BASE_URL`, sinon l'API elle-même. */
export function logoPublicBaseUrl(): string {
  const configured = process.env.PUBLIC_ASSETS_BASE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `http://localhost:${process.env.PORT ?? 3001}${logoRoutePath()}`;
}

/** Stockage sur disque local ; un adaptateur S3 public pourra le remplacer sans toucher aux cas d'usage. */
@Injectable()
export class LocalLogoStorageAdapter implements LogoStoragePort {
  async store(content: Buffer, extension: string): Promise<string> {
    const directory = logoStorageDir();
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, filename), content, { flag: "wx" });
    return `${logoPublicBaseUrl()}/${filename}`;
  }

  isOwnUrl(url: string): boolean {
    const prefix = `${logoPublicBaseUrl()}/`;
    return url.startsWith(prefix) && /^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(url.slice(prefix.length));
  }
}
