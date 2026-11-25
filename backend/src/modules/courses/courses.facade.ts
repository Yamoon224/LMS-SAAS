import { Injectable } from "@nestjs/common";

import { GetCourseUseCase } from "./application/get-course.use-case";
import { ListCoursesUseCase } from "./application/list-courses.use-case";
import { ManageCourseLocalesUseCase } from "./application/manage-course-locales.use-case";
import { UpsertCourseLocaleUseCase } from "./application/upsert-course-locale.use-case";
import type { CourseLocaleInfo, UpsertCourseLocaleData } from "./domain/course-locale.repository.port";
import type { Course } from "./domain/course.entity";

/**
 * Seule API publique du module courses. Utilisée par enrollments (prix
 * figé à l'inscription, RG-05), payments (initiation d'un achat de
 * formation) et ai-translation (écriture de la fiche formation traduite,
 * ENT-46).
 */
@Injectable()
export class CoursesFacade {
  constructor(
    private readonly getCourseUseCase: GetCourseUseCase,
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly upsertCourseLocaleUseCase: UpsertCourseLocaleUseCase,
    private readonly manageCourseLocalesUseCase: ManageCourseLocalesUseCase,
  ) {}

  async findById(courseId: string): Promise<Course> {
    return this.getCourseUseCase.execute(courseId);
  }

  /** Lève NotFoundDomainError si la formation n'existe pas OU appartient à un autre tenant. */
  async findByIdInTenant(courseId: string, tenantId: string): Promise<Course> {
    return this.getCourseUseCase.executeInTenant(courseId, tenantId);
  }

  /** Une seule requête pour N formations du tenant (enrichissement de listes). */
  async findManyInTenant(courseIds: string[], tenantId: string): Promise<Course[]> {
    return this.getCourseUseCase.executeManyInTenant(courseIds, tenantId);
  }

  async assertCourseInTenant(courseId: string, tenantId: string): Promise<void> {
    await this.getCourseUseCase.executeInTenant(courseId, tenantId);
  }

  /** PUB-02 : formations PUBLIÉES du tenant (catalogue public). */
  async listPublished(tenantId: string): Promise<Course[]> {
    return this.listCoursesUseCase.listPublished(tenantId);
  }

  /** PUB-03 : une formation PUBLIÉE du tenant ; brouillon, masquée, archivée, inconnue ou d'un autre tenant : NotFoundDomainError. */
  async findPublished(courseId: string, tenantId: string): Promise<Course> {
    return this.getCourseUseCase.executePublished(courseId, tenantId);
  }

  /** PUB-02/PUB-03 : langues des traductions publiées de plusieurs formations (hors langue d'origine). */
  async listPublishedLocalesByCourses(courseIds: string[]): Promise<Map<string, string[]>> {
    return this.manageCourseLocalesUseCase.listPublishedLocalesByCourses(courseIds);
  }

  async upsertCourseLocale(data: UpsertCourseLocaleData): Promise<void> {
    await this.upsertCourseLocaleUseCase.execute(data);
  }

  /** PUB-17 : fiches traduites d'une formation (langue, statut, origine). */
  async listCourseLocales(courseId: string): Promise<CourseLocaleInfo[]> {
    return this.manageCourseLocalesUseCase.list(courseId);
  }

  /** PUB-17 : langues dont la fiche est publiée. */
  async listPublishedCourseLocales(courseId: string): Promise<string[]> {
    return this.manageCourseLocalesUseCase.listPublishedLocales(courseId);
  }

  /** PUB-17 : publie ou repasse en brouillon la fiche d'une langue ; false si cette langue n'existe pas. */
  async setCourseLocaleStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<boolean> {
    return this.manageCourseLocalesUseCase.setStatus(courseId, locale, status);
  }
}
