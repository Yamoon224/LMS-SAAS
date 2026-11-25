import { Inject, Injectable } from "@nestjs/common";

import { COURSE_LOCALE_REPOSITORY } from "../domain/course-locale.repository.port";
import type { CourseLocaleInfo, CourseLocaleRepositoryPort } from "../domain/course-locale.repository.port";

/** PUB-17 : langues d'une formation et publication de la fiche traduite. */
@Injectable()
export class ManageCourseLocalesUseCase {
  constructor(@Inject(COURSE_LOCALE_REPOSITORY) private readonly repository: CourseLocaleRepositoryPort) {}

  list(courseId: string): Promise<CourseLocaleInfo[]> {
    return this.repository.listByCourse(courseId);
  }

  /** Langues dont la fiche est publiée (hors langue source). */
  async listPublishedLocales(courseId: string): Promise<string[]> {
    const locales = await this.repository.listByCourse(courseId);
    return locales.filter((entry) => entry.status === "PUBLISHED").map((entry) => entry.locale);
  }

  /** Langues publiées de plusieurs formations (catalogue public), indexées par formation. */
  listPublishedLocalesByCourses(courseIds: string[]): Promise<Map<string, string[]>> {
    return this.repository.listPublishedLocalesByCourses(courseIds);
  }

  /** Renvoie false si la formation n'a pas de fiche pour cette langue (rien n'a été modifié). */
  setStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<boolean> {
    return this.repository.setStatus(courseId, locale, status);
  }
}
