import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckQuota, CurrentTenant, RequirePermissions } from "@shared/decorators";

import { ChangeCourseStatusUseCase } from "../application/change-course-status.use-case";
import { CreateCourseUseCase } from "../application/create-course.use-case";
import { DuplicateCourseUseCase } from "../application/duplicate-course.use-case";
import { GetCourseUseCase } from "../application/get-course.use-case";
import { ListCoursesUseCase } from "../application/list-courses.use-case";
import { UpdateCourseUseCase } from "../application/update-course.use-case";
import type { Course } from "../domain/course.entity";

import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

/** Fiche formation aplatie (ENT-15/PUB-03) — même forme que les autres handlers de ce contrôleur. */
function toCourseResponse(course: Course) {
  return {
    id: course.id,
    tenantId: course.tenantId,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    type: course.type,
    status: course.status,
    progressionMode: course.progressionMode,
    sourceLocale: course.sourceLocale,
    price: course.price,
    compareAtPrice: course.compareAtPrice,
    currency: course.currency,
    accessDurationDays: course.accessDurationDays,
    category: course.category,
    level: course.level,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    coverImageUrl: course.coverImageUrl,
    instructorIds: course.instructorIds,
    publishedAt: course.publishedAt,
    certificateTemplateId: course.certificateTemplateId,
  };
}

/** ENT-15 à ENT-20: gestion des formations par l'entreprise. */
@ApiTags("Entreprise / Formations")
@Controller("business/courses")
export class BusinessCoursesController {
  constructor(
    private readonly createCourseUseCase: CreateCourseUseCase,
    private readonly updateCourseUseCase: UpdateCourseUseCase,
    private readonly changeCourseStatusUseCase: ChangeCourseStatusUseCase,
    private readonly duplicateCourseUseCase: DuplicateCourseUseCase,
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly getCourseUseCase: GetCourseUseCase,
  ) {}

  @Post()
  @RequirePermissions("courses.manage")
  @CheckQuota("maxCourses")
  @ApiOperation({ summary: "Créer une formation, en brouillon (ENT-15)" })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCourseDto) {
    const course = await this.createCourseUseCase.execute({ tenantId, ...dto });
    return { id: course.id, status: course.status };
  }

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Lister les formations de l'entreprise" })
  async list(@CurrentTenant() tenantId: string) {
    const courses = await this.listCoursesUseCase.listForTenant({ tenantId });
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      price: course.price,
    }));
  }

  @Get(":id")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Fiche formation" })
  async findOne(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    const course = await this.getCourseUseCase.executeInTenant(id, tenantId);
    return toCourseResponse(course);
  }

  @Put(":id")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Modifier une formation (ENT-15/ENT-21)" })
  async update(
    @CurrentTenant() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    await this.updateCourseUseCase.execute(id, tenantId, dto);
    return { id };
  }

  @Post(":id/publish")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Publier une formation (ENT-18)" })
  async publish(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    await this.changeCourseStatusUseCase.publish(id, tenantId);
    return { id, status: "PUBLISHED" };
  }

  @Post(":id/hide")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Masquer une formation, accès des inscrits conservé (ENT-18)" })
  async hide(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    await this.changeCourseStatusUseCase.hide(id, tenantId);
    return { id, status: "HIDDEN" };
  }

  @Post(":id/archive")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Archiver une formation (ENT-18)" })
  async archive(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    await this.changeCourseStatusUseCase.archive(id, tenantId);
    return { id, status: "ARCHIVED" };
  }

  @Post(":id/duplicate")
  @RequirePermissions("courses.manage")
  @CheckQuota("maxCourses")
  @ApiOperation({ summary: "Dupliquer une formation (ENT-20)" })
  async duplicate(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    const copy = await this.duplicateCourseUseCase.execute(id, tenantId);
    return { id: copy.id, status: copy.status };
  }
}
