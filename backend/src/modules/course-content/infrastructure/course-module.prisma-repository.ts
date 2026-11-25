import { Injectable } from "@nestjs/common";
import type { Module as PrismaModule } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { CourseModule } from "../domain/course-module.entity";
import type {
  CourseModuleRepositoryPort,
  CreateModuleData,
  UpdateModuleData,
} from "../domain/course-module.repository.port";

@Injectable()
export class CourseModulePrismaRepository implements CourseModuleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CourseModule | null> {
    const record = await this.prisma.module.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCourse(courseId: string): Promise<CourseModule[]> {
    const records = await this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateModuleData): Promise<CourseModule> {
    const record = await this.prisma.module.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        order: data.order,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateModuleData): Promise<void> {
    await this.prisma.module.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.module.delete({ where: { id } });
  }

  async reorder(courseId: string, orderedModuleIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedModuleIds.map((id, index) =>
        this.prisma.module.update({
          where: { id, courseId },
          data: { order: index },
        }),
      ),
    );
  }

  async nextOrder(courseId: string): Promise<number> {
    const last = await this.prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: "desc" },
    });
    return (last?.order ?? -1) + 1;
  }

  private toDomain(record: PrismaModule): CourseModule {
    return CourseModule.fromPersistence({
      id: record.id,
      courseId: record.courseId,
      title: record.title,
      description: record.description,
      order: record.order,
      estimatedDurationMinutes: record.estimatedDurationMinutes,
    });
  }
}
