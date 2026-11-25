import type { LegalDocument, LegalDocumentType } from "./legal-document";

export interface LegalDocumentWithStats extends LegalDocument {
  acceptancesCount: number;
}

export interface LegalRepositoryPort {
  /** Toutes les versions de tous les types, avec le nombre d'acceptations. */
  listAll(): Promise<LegalDocumentWithStats[]>;
  listByType(type: LegalDocumentType): Promise<LegalDocument[]>;
  findById(id: string): Promise<LegalDocument | null>;
  createDraft(data: { type: LegalDocumentType; version: number; title: string; content: string }): Promise<LegalDocument>;
  updateDraft(id: string, data: { title: string; content: string }): Promise<void>;
  markPublished(id: string, at: Date): Promise<void>;
  /** Parmi ces documents, ceux que l'utilisateur a déjà acceptés. */
  findAcceptedDocumentIds(userId: string, documentIds: readonly string[]): Promise<string[]>;
  /** Idempotent : accepter deux fois la même version ne crée qu'une trace. */
  recordAcceptance(userId: string, documentId: string): Promise<void>;
}

export const LEGAL_REPOSITORY = Symbol("LEGAL_REPOSITORY");
