import { DomainError, InvalidStateTransitionError } from "@shared/errors";

/** Doit rester cohérent avec l'enum Prisma LegalDocumentType. */
export const LEGAL_DOCUMENT_TYPES = ["TERMS_OF_USE", "TERMS_OF_SALE", "PRIVACY_POLICY"] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

/**
 * Documents que tout apprenant doit avoir acceptés pour utiliser la plateforme. Les CGV restent consultables
 * mais ne bloquent pas l'accès (elles s'appliquent à l'achat).
 */
export const LEARNER_REQUIRED_TYPES: readonly LegalDocumentType[] = ["TERMS_OF_USE", "PRIVACY_POLICY"];

export function isLegalDocumentType(value: string): value is LegalDocumentType {
  return (LEGAL_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: number;
  title: string;
  content: string;
  /** null = brouillon. */
  publishedAt: Date | null;
  createdAt: Date;
}

export class LegalDocumentIncompleteError extends DomainError {
  readonly code = "DOCUMENT_LEGAL_INCOMPLET";
}

export class LegalDocumentVersionChangedError extends DomainError {
  readonly code = "VERSION_DOCUMENT_LEGAL_PERIMEE";
}

export class LegalDocumentUnknownTypeError extends DomainError {
  readonly code = "TYPE_DOCUMENT_LEGAL_INCONNU";
}

/** Numéro de la prochaine version d'un type : strictement supérieur à toutes les versions existantes. */
export function nextVersionNumber(existingVersions: readonly number[]): number {
  return existingVersions.length === 0 ? 1 : Math.max(...existingVersions) + 1;
}

export function isPublished(document: Pick<LegalDocument, "publishedAt">): boolean {
  return document.publishedAt !== null;
}

/** Une version publiée est immuable (« versionnées ») : seule une nouvelle version peut la remplacer. */
export function assertEditable(document: Pick<LegalDocument, "publishedAt" | "version">): void {
  if (isPublished(document)) {
    throw new InvalidStateTransitionError(
      `La version ${document.version} est publiée et ne peut plus être modifiée : créez une nouvelle version.`,
    );
  }
}

/** Un brouillon ne peut être publié que s'il a un titre et un contenu non vides. */
export function assertPublishable(document: Pick<LegalDocument, "publishedAt" | "version" | "title" | "content">): void {
  assertEditable(document);
  if (!document.title.trim() || !document.content.trim()) {
    throw new LegalDocumentIncompleteError("Un document doit avoir un titre et un contenu avant d'être publié.");
  }
}

/** Documents courants que l'utilisateur n'a pas encore acceptés (version précise, pas seulement le type). */
export function pendingForUser(
  currents: readonly LegalDocument[],
  acceptedDocumentIds: ReadonlySet<string>,
): LegalDocument[] {
  return currents.filter((document) => !acceptedDocumentIds.has(document.id));
}

/** Version courante d'un type : la plus récente version publiée, sinon null. */
export function currentPublished(documents: readonly LegalDocument[]): LegalDocument | null {
  return (
    documents
      .filter(isPublished)
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}
