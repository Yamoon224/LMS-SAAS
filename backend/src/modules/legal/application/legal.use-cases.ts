import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import {
  assertEditable,
  assertPublishable,
  currentPublished,
  isLegalDocumentType,
  LEARNER_REQUIRED_TYPES,
  LegalDocumentUnknownTypeError,
  LegalDocumentVersionChangedError,
  nextVersionNumber,
  pendingForUser,
} from "../domain/legal-document";
import type { LegalDocument, LegalDocumentType } from "../domain/legal-document";
import { LEGAL_REPOSITORY } from "../domain/legal.repository.port";
import type { LegalDocumentWithStats, LegalRepositoryPort } from "../domain/legal.repository.port";

function parseType(value: string): LegalDocumentType {
  if (!isLegalDocumentType(value)) {
    throw new LegalDocumentUnknownTypeError(`Type de document légal inconnu: ${value}`);
  }
  return value;
}

/** ADM-41 : l'Admin crée une nouvelle version en brouillon (numérotée automatiquement). */
@Injectable()
export class CreateLegalDraftUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(input: { type: string; title: string; content: string }): Promise<LegalDocument> {
    const type = parseType(input.type);
    const existing = await this.repository.listByType(type);
    return this.repository.createDraft({
      type,
      version: nextVersionNumber(existing.map((document) => document.version)),
      title: input.title.trim(),
      content: input.content,
    });
  }
}

/** Modification d'un brouillon ; une version publiée est refusée. */
@Injectable()
export class UpdateLegalDraftUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(id: string, input: { title: string; content: string }): Promise<void> {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundDomainError(`Document légal introuvable: ${id}`);
    assertEditable(document);
    await this.repository.updateDraft(id, { title: input.title.trim(), content: input.content });
  }
}

/** Publication d'un brouillon : il devient la version courante de son type. */
@Injectable()
export class PublishLegalDocumentUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundDomainError(`Document légal introuvable: ${id}`);
    assertPublishable(document);
    await this.repository.markPublished(id, new Date());
  }
}

@Injectable()
export class ListLegalDocumentsUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  execute(): Promise<LegalDocumentWithStats[]> {
    return this.repository.listAll();
  }
}

/** Lecture publique : version courante (publiée la plus récente) d'un type. */
@Injectable()
export class GetCurrentLegalDocumentUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(rawType: string): Promise<LegalDocument> {
    const type = parseType(rawType);
    const current = currentPublished(await this.repository.listByType(type));
    if (!current) throw new NotFoundDomainError(`Aucune version publiée pour: ${type}`);
    return current;
  }
}

/** Documents obligatoires dont la version courante n'a pas encore été acceptée par l'apprenant connecté. */
@Injectable()
export class ListPendingLegalDocumentsUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(userId: string): Promise<LegalDocument[]> {
    const currents: LegalDocument[] = [];
    for (const type of LEARNER_REQUIRED_TYPES) {
      const current = currentPublished(await this.repository.listByType(type));
      if (current) currents.push(current);
    }
    const accepted = await this.repository.findAcceptedDocumentIds(
      userId,
      currents.map((document) => document.id),
    );
    return pendingForUser(currents, new Set(accepted));
  }
}

/**
 * ADM-41 : trace l'acceptation d'une version précise. La version affichée à l'utilisateur est transmise : si une
 * nouvelle version a été publiée entre-temps, l'acceptation est refusée plutôt que d'enregistrer un texte non lu.
 */
@Injectable()
export class AcceptLegalDocumentUseCase {
  constructor(@Inject(LEGAL_REPOSITORY) private readonly repository: LegalRepositoryPort) {}

  async execute(userId: string, rawType: string, version: number): Promise<{ version: number }> {
    const type = parseType(rawType);
    const current = currentPublished(await this.repository.listByType(type));
    if (!current) throw new NotFoundDomainError(`Aucune version publiée pour: ${type}`);
    if (current.version !== version) {
      throw new LegalDocumentVersionChangedError(
        `La version ${version} n'est plus la version courante (${current.version}) : relisez le document.`,
      );
    }
    await this.repository.recordAcceptance(userId, current.id);
    return { version: current.version };
  }
}
