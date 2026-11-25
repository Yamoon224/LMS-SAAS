import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  LessonLocaleRepositoryPort,
  LessonLocaleSummary,
  UpsertLessonLocaleData,
} from "../domain/lesson-locale.repository.port";

@Injectable()
export class LessonLocalePrismaRepository implements LessonLocaleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByLessonAndLocale(
    lessonId: string,
    locale: string,
  ): Promise<{ title: string | null; contentHtml: string | null } | null> {
    const record = await this.prisma.lessonLocale.findUnique({
      where: { lessonId_locale: { lessonId, locale } },
      select: { title: true, contentHtml: true },
    });
    return record ?? null;
  }

  async upsert(data: UpsertLessonLocaleData): Promise<void> {
    await this.prisma.lessonLocale.upsert({
      where: { lessonId_locale: { lessonId: data.lessonId, locale: data.locale } },
      create: {
        lessonId: data.lessonId,
        locale: data.locale,
        title: data.title,
        contentHtml: data.contentHtml,
        origin: data.origin,
        status: "DRAFT",
      },
      update: {
        title: data.title,
        contentHtml: data.contentHtml,
        origin: data.origin,
        // Une retraduction remplace le texte : elle repasse en brouillon pour être relue avant d'être republiée.
        status: "DRAFT",
      },
    });
  }

  async findPublished(
    lessonId: string,
    locale: string,
  ): Promise<{ title: string | null; contentHtml: string | null } | null> {
    const record = await this.prisma.lessonLocale.findFirst({
      where: { lessonId, locale, status: "PUBLISHED" },
      select: { title: true, contentHtml: true },
    });
    return record ?? null;
  }

  async listPublishedTitles(courseId: string, locale: string): Promise<{ lessonId: string; title: string | null }[]> {
    return this.prisma.lessonLocale.findMany({
      where: { locale, status: "PUBLISHED", lesson: { module: { courseId } } },
      select: { lessonId: true, title: true },
    });
  }

  async summarizeByCourse(courseId: string): Promise<LessonLocaleSummary[]> {
    const groups = await this.prisma.lessonLocale.groupBy({
      by: ["locale", "status"],
      where: { lesson: { module: { courseId } } },
      _count: { _all: true },
    });
    return groups.map((group) => ({ locale: group.locale, status: group.status, count: group._count._all }));
  }

  async setStatusForCourse(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<number> {
    const result = await this.prisma.lessonLocale.updateMany({
      where: { locale, lesson: { module: { courseId } } },
      data: { status },
    });
    return result.count;
  }
}
