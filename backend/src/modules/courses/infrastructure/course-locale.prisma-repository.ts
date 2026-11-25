import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  CourseLocaleInfo,
  CourseLocaleRepositoryPort,
  UpsertCourseLocaleData,
} from "../domain/course-locale.repository.port";

@Injectable()
export class CourseLocalePrismaRepository implements CourseLocaleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertCourseLocaleData): Promise<void> {
    await this.prisma.courseLocale.upsert({
      where: { courseId_locale: { courseId: data.courseId, locale: data.locale } },
      create: {
        courseId: data.courseId,
        locale: data.locale,
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        origin: data.origin,
        status: "DRAFT",
      },
      update: {
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        origin: data.origin,
        // Une retraduction remplace le texte : elle repasse en brouillon pour être relue avant d'être republiée.
        status: "DRAFT",
      },
    });
  }

  async listByCourse(courseId: string): Promise<CourseLocaleInfo[]> {
    return this.prisma.courseLocale.findMany({
      where: { courseId },
      select: { locale: true, status: true, origin: true },
      orderBy: { locale: "asc" },
    });
  }

  async listPublishedLocalesByCourses(courseIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (courseIds.length === 0) return result;
    const rows = await this.prisma.courseLocale.findMany({
      where: { courseId: { in: courseIds }, status: "PUBLISHED" },
      select: { courseId: true, locale: true },
      orderBy: { locale: "asc" },
    });
    for (const row of rows) {
      result.set(row.courseId, [...(result.get(row.courseId) ?? []), row.locale]);
    }
    return result;
  }

  async setStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<boolean> {
    const result = await this.prisma.courseLocale.updateMany({ where: { courseId, locale }, data: { status } });
    return result.count > 0;
  }
}
