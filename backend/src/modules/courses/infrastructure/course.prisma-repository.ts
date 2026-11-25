import { Injectable } from "@nestjs/common";
import type { Course as PrismaCourse } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { CourseStatus } from "../domain/course-status";
import type { CourseType, ProgressionMode } from "../domain/course-type";
import { Course } from "../domain/course.entity";
import type {
  CourseFilters,
  CourseRepositoryPort,
  CreateCourseData,
  UpdateCourseData,
} from "../domain/course.repository.port";

type PrismaCourseWithInstructors = PrismaCourse & { instructors: { userId: string }[] };

@Injectable()
export class CoursePrismaRepository implements CourseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Course | null> {
    const record = await this.prisma.course.findUnique({
      where: { id },
      include: { instructors: { select: { userId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByIdInTenant(id: string, tenantId: string): Promise<Course | null> {
    const record = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: { instructors: { select: { userId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findManyByIdsInTenant(ids: string[], tenantId: string): Promise<Course[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.course.findMany({
      where: { id: { in: [...new Set(ids)] }, tenantId },
      include: { instructors: { select: { userId: true } } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async list(filters: CourseFilters): Promise<Course[]> {
    const records = await this.prisma.course.findMany({
      where: { tenantId: filters.tenantId, status: filters.status, category: filters.category },
      include: { instructors: { select: { userId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateCourseData): Promise<Course> {
    const record = await this.prisma.course.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        type: data.type,
        progressionMode: data.progressionMode,
        sourceLocale: data.sourceLocale,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        currency: data.currency,
        accessDurationDays: data.accessDurationDays,
        category: data.category,
        level: data.level,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        coverImageUrl: data.coverImageUrl,
        status: "DRAFT",
        instructors: { create: data.instructorIds.map((userId) => ({ userId })) },
      },
      include: { instructors: { select: { userId: true } } },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateCourseData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id },
        data: {
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          progressionMode: data.progressionMode,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          accessDurationDays: data.accessDurationDays,
          category: data.category,
          level: data.level,
          estimatedDurationMinutes: data.estimatedDurationMinutes,
          coverImageUrl: data.coverImageUrl,
        },
      });

      if (data.instructorIds) {
        await tx.courseInstructor.deleteMany({ where: { courseId: id } });
        await tx.courseInstructor.createMany({
          data: data.instructorIds.map((userId) => ({ courseId: id, userId })),
        });
      }
    });
  }

  async updateStatus(id: string, status: CourseStatus): Promise<void> {
    await this.prisma.course.update({
      where: { id },
      data: {
        status,
        publishedAt: status === CourseStatus.PUBLISHED ? new Date() : undefined,
        archivedAt: status === CourseStatus.ARCHIVED ? new Date() : undefined,
      },
    });
  }

  async countActiveByTenant(tenantId: string): Promise<number> {
    return this.prisma.course.count({ where: { tenantId, status: { not: "ARCHIVED" } } });
  }

  private toDomain(record: PrismaCourseWithInstructors): Course {
    return Course.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      title: record.title,
      subtitle: record.subtitle,
      description: record.description,
      type: record.type as CourseType,
      status: record.status as CourseStatus,
      progressionMode: record.progressionMode as ProgressionMode,
      sourceLocale: record.sourceLocale,
      price: record.price,
      compareAtPrice: record.compareAtPrice,
      currency: record.currency,
      accessDurationDays: record.accessDurationDays,
      category: record.category,
      level: record.level,
      estimatedDurationMinutes: record.estimatedDurationMinutes,
      coverImageUrl: record.coverImageUrl,
      instructorIds: record.instructors.map((instructor) => instructor.userId),
      publishedAt: record.publishedAt,
      certificateTemplateId: record.certificateTemplateId,
    });
  }
}
