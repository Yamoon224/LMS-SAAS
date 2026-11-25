import { Injectable } from "@nestjs/common";
import type { Lesson as PrismaLesson } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { Lesson } from "../domain/lesson.entity";
import type {
  CreateLessonData,
  LessonRepositoryPort,
  UpdateLessonData,
} from "../domain/lesson.repository.port";
import type { CompletionCriteria, ResourceType } from "../domain/resource-type";

@Injectable()
export class LessonPrismaRepository implements LessonRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Lesson | null> {
    const record = await this.prisma.lesson.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async listByModule(moduleId: string): Promise<Lesson[]> {
    const records = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateLessonData): Promise<Lesson> {
    const record = await this.prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        contentHtml: data.contentHtml,
        resourceType: data.resourceType,
        storageUrl: data.storageUrl,
        isMandatory: data.isMandatory,
        completionCriteria: data.completionCriteria as object | undefined,
        downloadAllowed: data.downloadAllowed,
        order: data.order,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateLessonData): Promise<void> {
    await this.prisma.lesson.update({
      where: { id },
      data: {
        title: data.title,
        contentHtml: data.contentHtml,
        storageUrl: data.storageUrl,
        isMandatory: data.isMandatory,
        completionCriteria: data.completionCriteria as object | undefined,
        downloadAllowed: data.downloadAllowed,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lesson.delete({ where: { id } });
  }

  async reorder(moduleId: string, orderedLessonIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedLessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id, moduleId },
          data: { order: index },
        }),
      ),
    );
  }

  async nextOrder(moduleId: string): Promise<number> {
    const last = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: "desc" },
    });
    return (last?.order ?? -1) + 1;
  }

  private toDomain(record: PrismaLesson): Lesson {
    return Lesson.fromPersistence({
      id: record.id,
      moduleId: record.moduleId,
      title: record.title,
      order: record.order,
      contentHtml: record.contentHtml,
      resourceType: record.resourceType as ResourceType,
      storageUrl: record.storageUrl,
      isMandatory: record.isMandatory,
      completionCriteria: record.completionCriteria as CompletionCriteria | null,
      downloadAllowed: record.downloadAllowed,
    });
  }
}
