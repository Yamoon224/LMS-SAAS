import { Attendance, type AttendanceProps } from "./attendance.entity";

function buildAttendance(overrides: Partial<AttendanceProps> = {}): Attendance {
  const props: AttendanceProps = {
    id: "attendance-1",
    liveSessionId: "session-1",
    userId: "user-1",
    joinedAt: null,
    leftAt: null,
    attended: false,
    ...overrides,
  };
  return Attendance.fromPersistence(props);
}

describe("Attendance", () => {
  describe("recordJoin", () => {
    it("fixe joinedAt à la première connexion", () => {
      const at = new Date("2026-03-15T10:00:00Z");
      const attendance = buildAttendance();
      attendance.recordJoin(at);
      expect(attendance.toSnapshot().joinedAt).toEqual(at);
    });

    it("ne réécrit pas joinedAt si déjà fixé (ne garde que la première connexion)", () => {
      const firstJoin = new Date("2026-03-15T10:00:00Z");
      const attendance = buildAttendance({ joinedAt: firstJoin });
      attendance.recordJoin(new Date("2026-03-15T10:05:00Z"));
      expect(attendance.toSnapshot().joinedAt).toEqual(firstJoin);
    });
  });

  describe("recordLeave (RG-08b)", () => {
    it("marque attended=true si la durée de présence atteint le seuil minimal", () => {
      const joinedAt = new Date("2026-03-15T10:00:00Z");
      const leftAt = new Date("2026-03-15T10:50:00Z"); // 50 min sur 60 = 83%
      const attendance = buildAttendance({ joinedAt });
      attendance.recordLeave(60, 70, leftAt);
      expect(attendance.attended).toBe(true);
    });

    it("marque attended=false si la durée de présence est sous le seuil minimal", () => {
      const joinedAt = new Date("2026-03-15T10:00:00Z");
      const leftAt = new Date("2026-03-15T10:10:00Z"); // 10 min sur 60 = 17%
      const attendance = buildAttendance({ joinedAt });
      attendance.recordLeave(60, 70, leftAt);
      expect(attendance.attended).toBe(false);
    });

    it("marque attended=false si l'apprenant ne s'est jamais connecté", () => {
      const attendance = buildAttendance({ joinedAt: null });
      attendance.recordLeave(60, 70, new Date("2026-03-15T10:50:00Z"));
      expect(attendance.attended).toBe(false);
    });

    it("fixe leftAt même quand la présence n'est pas retenue", () => {
      const leftAt = new Date("2026-03-15T10:50:00Z");
      const attendance = buildAttendance({ joinedAt: null });
      attendance.recordLeave(60, 70, leftAt);
      expect(attendance.toSnapshot().leftAt).toEqual(leftAt);
    });
  });
});

describe("Attendance accessors and manual marking (ENT-57)", () => {
  it("expose id, session, utilisateur et statut", () => {
    const attendance = buildAttendance({ attended: true });
    expect(attendance.id).toBe("attendance-1");
    expect(attendance.liveSessionId).toBe("session-1");
    expect(attendance.userId).toBe("user-1");
    expect(attendance.attended).toBe(true);
    expect(attendance.markedManually).toBe(false);
  });

  it("le pointage manuel fixe attended et ses métadonnées", () => {
    const at = new Date("2026-03-15T11:00:00Z");
    const attendance = buildAttendance();
    attendance.markManually(true, "admin-1", at);
    expect(attendance.attended).toBe(true);
    expect(attendance.markedManually).toBe(true);
    expect(attendance.toSnapshot()).toMatchObject({ markedById: "admin-1", markedAt: at });
  });

  it("le pointage manuel prime sur la durée de connexion à la déconnexion", () => {
    const attendance = buildAttendance({ joinedAt: new Date("2026-03-15T10:00:00Z") });
    attendance.markManually(false, "admin-1");
    attendance.recordLeave(60, 70, new Date("2026-03-15T11:00:00Z"));
    expect(attendance.attended).toBe(false);
    expect(attendance.toSnapshot().leftAt).toEqual(new Date("2026-03-15T11:00:00Z"));
  });
});
