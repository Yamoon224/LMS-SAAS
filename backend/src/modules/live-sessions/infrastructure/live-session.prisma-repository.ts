import { Injectable } from "@nestjs/common";
import type { LiveSession as PrismaLiveSession } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { LiveSessionStatus } from "../domain/live-session-status";
import { LiveSession } from "../domain/live-session.entity";
import type {
  CreateLiveSessionData,
  LiveSessionRepositoryPort,
} from "../domain/live-session.repository.port";

@Injectable()
export class LiveSessionPrismaRepository implements LiveSessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LiveSession | null> {
    const record = await this.prisma.liveSession.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCourse(courseId: string): Promise<LiveSession[]> {
    const records = await this.prisma.liveSession.findMany({
      where: { courseId },
      orderBy: { startAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByModule(moduleId: string): Promise<LiveSession[]> {
    const records = await this.prisma.liveSession.findMany({
      where: { moduleId },
      orderBy: { startAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listUpcomingByCourses(courseIds: string[], from: Date, limit: number): Promise<LiveSession[]> {
    if (courseIds.length === 0) return [];
    // Les sessions commencées il y a moins de 12 h sont relues puis filtrées sur leur fin réelle.
    const lowerBound = new Date(from.getTime() - 12 * 3_600_000);
    const records = await this.prisma.liveSession.findMany({
      where: { courseId: { in: courseIds }, status: { in: ["SCHEDULED", "IN_PROGRESS"] }, startAt: { gte: lowerBound } },
      orderBy: { startAt: "asc" },
      take: Math.max(1, limit) * 3,
    });
    return records
      .map((record) => this.toDomain(record))
      .filter((session) => this.endsAt(session) > from)
      .slice(0, limit);
  }

  async listScheduledStartingBefore(cutoff: Date): Promise<LiveSession[]> {
    const records = await this.prisma.liveSession.findMany({
      where: { status: "SCHEDULED", startAt: { lte: cutoff } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listInProgressEndingBefore(cutoff: Date): Promise<LiveSession[]> {
    const records = await this.prisma.liveSession.findMany({ where: { status: "IN_PROGRESS" } });
    return records
      .map((record) => this.toDomain(record))
      .filter((session) => this.endsAt(session) <= cutoff);
  }

  async create(data: CreateLiveSessionData): Promise<LiveSession> {
    const record = await this.prisma.liveSession.create({
      data: {
        tenantId: data.tenantId,
        courseId: data.courseId,
        moduleId: data.moduleId,
        title: data.title,
        startAt: data.startAt,
        durationMinutes: data.durationMinutes,
        timezone: data.timezone,
        capacity: data.capacity,
      },
    });
    return this.toDomain(record);
  }

  async save(session: LiveSession): Promise<void> {
    const snapshot = session.toSnapshot();
    await this.prisma.liveSession.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        meetLink: snapshot.meetLink,
        googleEventId: snapshot.googleEventId,
        replayUrl: snapshot.replayUrl,
      },
    });
  }

  async countRegistrations(liveSessionId: string): Promise<number> {
    return this.prisma.attendance.count({ where: { liveSessionId } });
  }

  private endsAt(session: LiveSession): Date {
    const end = new Date(session.startAt);
    end.setMinutes(end.getMinutes() + session.durationMinutes);
    return end;
  }

  private toDomain(record: PrismaLiveSession): LiveSession {
    return LiveSession.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      courseId: record.courseId,
      moduleId: record.moduleId,
      title: record.title,
      startAt: record.startAt,
      durationMinutes: record.durationMinutes,
      timezone: record.timezone,
      status: record.status as LiveSessionStatus,
      meetLink: record.meetLink,
      googleEventId: record.googleEventId,
      capacity: record.capacity,
      replayUrl: record.replayUrl,
      createdAt: record.createdAt,
    });
  }
}
