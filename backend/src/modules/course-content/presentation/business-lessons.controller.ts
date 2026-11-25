import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { AssertContentInTenantUseCase } from "../application/assert-content-in-tenant.use-case";
import { CreateLessonUseCase } from "../application/create-lesson.use-case";
import { DeleteLessonUseCase } from "../application/delete-lesson.use-case";
import { LessonMediaUseCase } from "../application/lesson-media.use-case";
import { ListLessonsUseCase } from "../application/list-lessons.use-case";
import { ReorderLessonsUseCase } from "../application/reorder-lessons.use-case";
import { UpdateLessonUseCase } from "../application/update-lesson.use-case";
import { parseLessonStorage } from "../domain/lesson-storage";

import { CreateLessonDto } from "./dto/create-lesson.dto";
import { ReorderDto } from "./dto/reorder.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";

/** Lecture tolérante d'une valeur déjà persistée : une valeur illisible est traitée comme « aucune ressource ». */
function parseLessonStorageSafe(storageUrl: string | null) {
  try {
    return parseLessonStorage(storageUrl);
  } catch {
    return { kind: "NONE" } as const;
  }
}

/** ENT-23/ENT-24/ENT-25: contenu texte, ressources, contenus obligatoires d'un module. */
@ApiTags("Entreprise / Leçons et contenus")
@Controller("business/modules/:moduleId/lessons")
export class BusinessLessonsController {
  constructor(
    private readonly createLessonUseCase: CreateLessonUseCase,
    private readonly updateLessonUseCase: UpdateLessonUseCase,
    private readonly deleteLessonUseCase: DeleteLessonUseCase,
    private readonly reorderLessonsUseCase: ReorderLessonsUseCase,
    private readonly listLessonsUseCase: ListLessonsUseCase,
    private readonly assertContentInTenantUseCase: AssertContentInTenantUseCase,
    private readonly lessonMediaUseCase: LessonMediaUseCase,
  ) {}

  @Post()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Ajouter une leçon (ENT-23/ENT-24)" })
  async create(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    await this.assertContentInTenantUseCase.assertModule(moduleId, tenantId);
    await this.lessonMediaUseCase.assertValidForCreate(dto.resourceType, dto.storageUrl, tenantId);
    const lesson = await this.createLessonUseCase.execute({ moduleId, ...dto });
    return { id: lesson.id, order: lesson.order };
  }

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Lister les leçons d'un module" })
  async list(@CurrentTenant() tenantId: string, @Param("moduleId") moduleId: string) {
    await this.assertContentInTenantUseCase.assertModule(moduleId, tenantId);
    const lessons = await this.listLessonsUseCase.execute(moduleId);
    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      resourceType: lesson.resourceType,
      isMandatory: lesson.isMandatory,
    }));
  }

  @Get(":lessonId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Fiche d'une leçon pour l'édition : contenu, critère de consultation, média (ENT-23 à ENT-25)" })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Param("lessonId") lessonId: string,
  ) {
    await this.assertContentInTenantUseCase.assertLesson(lessonId, moduleId, tenantId);
    const { lesson, media } = await this.lessonMediaUseCase.getDetail(lessonId, tenantId);
    const ref = parseLessonStorageSafe(lesson.storageUrl);
    return {
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      resourceType: lesson.resourceType,
      contentHtml: lesson.contentHtml,
      isMandatory: lesson.isMandatory,
      completionCriteria: lesson.completionCriteria,
      downloadAllowed: lesson.downloadAllowed,
      mediaAssetId: ref.kind === "MEDIA" ? ref.mediaAssetId : null,
      externalUrl: ref.kind === "EXTERNAL" ? ref.url : null,
      media,
    };
  }

  @Delete(":lessonId/media")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Retirer le fichier téléversé d'une leçon et libérer le stockage (ENT-24)" })
  async removeMedia(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Param("lessonId") lessonId: string,
  ) {
    await this.assertContentInTenantUseCase.assertLesson(lessonId, moduleId, tenantId);
    await this.lessonMediaUseCase.removeMedia(lessonId, tenantId);
    return { id: lessonId, mediaRemoved: true };
  }

  @Put("reorder")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Réordonner les leçons par glisser-déposer (ENT-22)" })
  async reorder(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: ReorderDto,
  ) {
    await this.assertContentInTenantUseCase.assertModule(moduleId, tenantId);
    await this.reorderLessonsUseCase.execute(moduleId, dto.orderedIds);
    return { moduleId, order: dto.orderedIds };
  }

  @Put(":lessonId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Modifier une leçon (ENT-23/ENT-25)" })
  async update(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    await this.assertContentInTenantUseCase.assertLesson(lessonId, moduleId, tenantId);
    const replacedMediaId = await this.lessonMediaUseCase.assertValidForUpdate(lessonId, dto.storageUrl, tenantId);
    await this.updateLessonUseCase.execute(lessonId, { ...dto, storageUrl: dto.storageUrl?.trim() || (dto.storageUrl === undefined ? undefined : null) });
    if (replacedMediaId) await this.lessonMediaUseCase.release(replacedMediaId, tenantId);
    return { id: lessonId };
  }

  @Delete(":lessonId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Supprimer une leçon" })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Param("lessonId") lessonId: string,
  ) {
    await this.assertContentInTenantUseCase.assertLesson(lessonId, moduleId, tenantId);
    const mediaId = await this.lessonMediaUseCase.findMediaId(lessonId);
    await this.deleteLessonUseCase.execute(lessonId);
    if (mediaId) await this.lessonMediaUseCase.release(mediaId, tenantId);
    return { id: lessonId, deleted: true };
  }
}
