import { Injectable } from "@nestjs/common";
import type { Attendance as PrismaAttendance } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { Attendance } from "../domain/attendance.entity";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";

@Injectable()
export class AttendancePrismaRepository implements AttendanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByLiveSessionAndUser(liveSessionId: string, userId: string): Promise<Attendance | null> {
    const record = await this.prisma.attendance.findUnique({
      where: { liveSessionId_userId: { liveSessionId, userId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByLiveSession(liveSessionId: string): Promise<Attendance[]> {
    const records = await this.prisma.attendance.findMany({ where: { liveSessionId } });
    return records.map((record) => this.toDomain(record));
  }

  async listAttendedByUserAndModule(userId: string, moduleId: string): Promise<Attendance[]> {
    const records = await this.prisma.attendance.findMany({
      where: { userId, liveSession: { moduleId } },
    });
    return records.map((record) => this.toDomain(record));
  }

  async register(liveSessionId: string, userId: string): Promise<Attendance> {
    const record = await this.prisma.attendance.create({ data: { liveSessionId, userId } });
    return this.toDomain(record);
  }

  async save(attendance: Attendance): Promise<void> {
    const snapshot = attendance.toSnapshot();
    await this.prisma.attendance.update({
      where: { id: snapshot.id },
      data: {
        joinedAt: snapshot.joinedAt,
        leftAt: snapshot.leftAt,
        attended: snapshot.attended,
        markedManually: snapshot.markedManually ?? false,
        markedById: snapshot.markedById ?? null,
        markedAt: snapshot.markedAt ?? null,
      },
    });
  }

  private toDomain(record: PrismaAttendance): Attendance {
    return Attendance.fromPersistence({
      id: record.id,
      liveSessionId: record.liveSessionId,
      userId: record.userId,
      joinedAt: record.joinedAt,
      leftAt: record.leftAt,
      attended: record.attended,
      markedManually: record.markedManually,
      markedById: record.markedById,
      markedAt: record.markedAt,
    });
  }
}
