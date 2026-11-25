import type { UsersFacade } from "@modules/users/users.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { Attendance } from "../domain/attendance.entity";
import type { AttendanceRepositoryPort } from "../domain/attendance.repository.port";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import { ManageSessionAttendanceUseCase } from "./manage-session-attendance.use-case";

function attendance(userId: string, overrides: Partial<Parameters<typeof Attendance.fromPersistence>[0]> = {}) {
  return Attendance.fromPersistence({
    id: `att-${userId}`,
    liveSessionId: "s1",
    userId,
    joinedAt: null,
    leftAt: null,
    attended: false,
    ...overrides,
  });
}

describe("ManageSessionAttendanceUseCase (ENT-57)", () => {
  function build(tenantId = "t1") {
    const rows = new Map([
      ["u1", attendance("u1")],
      ["u2", attendance("u2", { attended: true, joinedAt: new Date() })],
    ]);
    const sessions = {
      findById: jest.fn().mockResolvedValue({ id: "s1", tenantId }),
    } as unknown as LiveSessionRepositoryPort;
    const attendances = {
      listByLiveSession: jest.fn().mockImplementation(() => Promise.resolve([...rows.values()])),
      findByLiveSessionAndUser: jest.fn().mockImplementation((_s: string, u: string) => Promise.resolve(rows.get(u) ?? null)),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendanceRepositoryPort;
    const users = {
      findManyByIds: jest.fn().mockResolvedValue([{ id: "u1", fullName: "Aya", email: "aya@ex.com" }]),
    } as unknown as UsersFacade;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    return { useCase: new ManageSessionAttendanceUseCase(sessions, attendances, users, emitter), attendances, emitter, rows };
  }

  it("lists registrants with PENDING / PRESENT statuses", async () => {
    const { useCase } = build();
    const list = await useCase.list("s1", "t1");
    expect(list.map((a) => [a.userId, a.status])).toEqual([
      ["u1", "PENDING"],
      ["u2", "PRESENT"],
    ]);
    expect(list[0]?.learnerName).toBe("Aya");
  });

  it("marks present then absent, persists and audits each change", async () => {
    const { useCase, attendances, emitter } = build();
    expect(await useCase.mark("s1", "t1", "u1", true, "admin-1")).toBe("PRESENT");
    expect(await useCase.mark("s1", "t1", "u1", false, "admin-1")).toBe("ABSENT");
    expect(attendances.save).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenLastCalledWith(
      "live-attendance.marked",
      expect.objectContaining({ liveSessionId: "s1", tenantId: "t1", actorId: "admin-1", learnerUserId: "u1", present: false }),
    );
  });

  it("refuses a session of another tenant and a non-registered learner", async () => {
    const { useCase } = build("other-tenant");
    await expect(useCase.mark("s1", "t1", "u1", true, "a")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.list("s1", "t1")).rejects.toThrow(NotFoundDomainError);
    const ok = build();
    await expect(ok.useCase.mark("s1", "t1", "ghost", true, "a")).rejects.toThrow(NotFoundDomainError);
  });

  it("a manual mark is not overwritten by the automatic leave computation", () => {
    const att = attendance("u1", { joinedAt: new Date("2026-11-01T10:00:00Z") });
    att.markManually(true, "admin", new Date());
    att.recordLeave(60, 70, new Date("2026-11-01T10:01:00Z")); // 1 min sur 60 : serait absent
    expect(att.attended).toBe(true);
  });
});
