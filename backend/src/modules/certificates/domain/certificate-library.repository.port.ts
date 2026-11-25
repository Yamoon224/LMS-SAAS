import type { CertificateDesign } from "./certificate-design";
import type { LibraryTemplate } from "./certificate-library";

export interface SaveLibraryTemplateData {
  name: string;
  description: string | null;
  design: CertificateDesign;
}

export interface CertificateLibraryRepositoryPort {
  /** Tous les modèles (vue Admin), plus récents d'abord. */
  listAll(): Promise<LibraryTemplate[]>;
  /** Modèles publiés seulement (vue entreprise). */
  listPublished(): Promise<LibraryTemplate[]>;
  findById(id: string): Promise<LibraryTemplate | null>;
  create(data: SaveLibraryTemplateData): Promise<LibraryTemplate>;
  update(id: string, data: SaveLibraryTemplateData): Promise<void>;
  setPublished(id: string, published: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export const CERTIFICATE_LIBRARY_REPOSITORY = Symbol("CERTIFICATE_LIBRARY_REPOSITORY");
