import { MediaFacade } from "@modules/media/media.facade";
import type { MediaAssetStatusView } from "@modules/media/media.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { assertMediaFitsResourceType, assertStorageRefFitsResourceType, parseLessonStorage } from "../domain/lesson-storage";
import type { Lesson } from "../domain/lesson.entity";
import { LESSON_REPOSITORY } from "../domain/lesson.repository.port";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";
import type { ResourceType } from "../domain/resource-type";

export interface LessonDetail {
  lesson: Lesson;
  /** État du média téléversé rattaché (en transcodage, prêt, échec...), null s'il n'y en a pas. */
  media: MediaAssetStatusView | null;
}

/**
 * ENT-24 : rattachement d'un média téléversé à une leçon. Le média doit appartenir au tenant de l'appelant (404 sinon,
 * jamais 403 : un identifiant d'un autre tenant est indiscernable d'un identifiant inconnu), correspondre au type de
 * la leçon et ne pas être refusé/échoué. Une URL externe doit être en https.
 */
@Injectable()
export class LessonMediaUseCase {
  private readonly logger = new Logger(LessonMediaUseCase.name);

  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessonRepository: LessonRepositoryPort,
    private readonly mediaFacade: MediaFacade,
  ) {}

  /** À la création : valide la ressource. */
  async assertValidForCreate(resourceType: ResourceType, storageUrl: string | undefined, tenantId: string): Promise<void> {
    await this.assertRefValid(resourceType, storageUrl, tenantId);
  }

  /**
   * À la modification : valide la nouvelle ressource (le type de la leçon est immuable) et retourne l'identifiant de
   * l'ancien média s'il est remplacé (à libérer après l'enregistrement), sinon null.
   */
  async assertValidForUpdate(lessonId: string, storageUrl: string | undefined, tenantId: string): Promise<string | null> {
    if (storageUrl === undefined) return null;
    const lesson = await this.getLesson(lessonId);
    await this.assertRefValid(lesson.resourceType, storageUrl, tenantId);

    const previous = parseLessonStorage(lesson.storageUrl ?? "");
    const next = parseLessonStorage(storageUrl);
    if (previous.kind !== "MEDIA") return null;
    return next.kind === "MEDIA" && next.mediaAssetId === previous.mediaAssetId ? null : previous.mediaAssetId;
  }

  /** Fiche de la leçon pour l'éditeur : contenu, critère, et état du média rattaché. */
  async getDetail(lessonId: string, tenantId: string): Promise<LessonDetail> {
    const lesson = await this.getLesson(lessonId);
    const ref = this.safeParse(lesson.storageUrl);
    let media: MediaAssetStatusView | null = null;
    if (ref?.kind === "MEDIA") {
      try {
        media = await this.mediaFacade.getAssetInTenant(ref.mediaAssetId, tenantId);
      } catch (error) {
        if (!(error instanceof NotFoundDomainError)) throw error;
        this.logger.warn(`Média introuvable pour la leçon ${lessonId}: ${ref.mediaAssetId}`);
      }
    }
    return { lesson, media };
  }

  /** Retire le fichier d'une leçon (la leçon n'est pas supprimée) et libère le stockage. */
  async removeMedia(lessonId: string, tenantId: string): Promise<void> {
    const lesson = await this.getLesson(lessonId);
    const ref = this.safeParse(lesson.storageUrl);
    await this.lessonRepository.update(lessonId, { storageUrl: null });
    if (ref?.kind === "MEDIA") await this.release(ref.mediaAssetId, tenantId);
  }

  /** Libère un média devenu inutile (remplacé, retiré, leçon supprimée) ; l'échec n'empêche pas l'opération appelante. */
  async release(mediaAssetId: string, tenantId: string): Promise<void> {
    try {
      await this.mediaFacade.deleteAsset(mediaAssetId, tenantId);
    } catch (error) {
      this.logger.warn(`Libération du média ${mediaAssetId} impossible : ${String(error)}`);
    }
  }

  /** Identifiant du média d'une leçon (pour la libérer à sa suppression), null s'il n'y en a pas. */
  async findMediaId(lessonId: string): Promise<string | null> {
    const lesson = await this.lessonRepository.findById(lessonId);
    const ref = lesson ? this.safeParse(lesson.storageUrl) : null;
    return ref?.kind === "MEDIA" ? ref.mediaAssetId : null;
  }

  private async assertRefValid(resourceType: ResourceType, storageUrl: string | undefined, tenantId: string): Promise<void> {
    const ref = parseLessonStorage(storageUrl);
    assertStorageRefFitsResourceType(resourceType, ref);
    if (ref.kind === "MEDIA") {
      // 404 si le média est inconnu OU d'un autre tenant.
      const media = await this.mediaFacade.getAssetInTenant(ref.mediaAssetId, tenantId);
      assertMediaFitsResourceType(resourceType, media);
    }
  }

  private async getLesson(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) throw new NotFoundDomainError(`Leçon introuvable: ${lessonId}`);
    return lesson;
  }

  /** Lecture tolérante d'une valeur déjà persistée (anciennes données) : une valeur illisible est ignorée. */
  private safeParse(storageUrl: string | null) {
    try {
      return parseLessonStorage(storageUrl);
    } catch {
      return null;
    }
  }
}
