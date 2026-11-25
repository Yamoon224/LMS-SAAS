import { EnrollmentStatus } from "./enrollment-status";
import { selectInactivityReminders } from "./inactivity-reminder";
import type { InactivityCandidate } from "./inactivity-reminder";

const now = new Date("2026-11-18T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

function candidate(overrides: Partial<InactivityCandidate> = {}): InactivityCandidate {
  return {
    enrollmentId: "e1",
    userId: "u1",
    courseId: "c1",
    status: EnrollmentStatus.ACTIVE,
    expiresAt: null,
    lastActivityAt: daysAgo(8),
    lastReminderAt: null,
    ...overrides,
  };
}

describe("selectInactivityReminders", () => {
  it("relance une inscription active inactive depuis 7 jours ou plus", () => {
    const result = selectInactivityReminders([candidate({ lastActivityAt: daysAgo(7) })], now);
    expect(result).toEqual([
      { enrollmentId: "e1", userId: "u1", courseId: "c1", daysInactive: 7, previousReminderAt: null },
    ]);
  });

  it("ne relance pas une activité récente (moins de 7 jours)", () => {
    expect(selectInactivityReminders([candidate({ lastActivityAt: daysAgo(6) })], now)).toEqual([]);
  });

  it.each([
    EnrollmentStatus.COMPLETED,
    EnrollmentStatus.SUSPENDED,
    EnrollmentStatus.EXPIRED,
    EnrollmentStatus.PENDING_PAYMENT,
    EnrollmentStatus.PENDING_VALIDATION,
    EnrollmentStatus.REFUSED,
  ])("ne relance jamais une inscription au statut %s", (status) => {
    expect(selectInactivityReminders([candidate({ status })], now)).toEqual([]);
  });

  it("ne relance pas une inscription dont l'accès est expiré (cron d'expiration en retard)", () => {
    expect(selectInactivityReminders([candidate({ expiresAt: daysAgo(1) })], now)).toEqual([]);
    expect(selectInactivityReminders([candidate({ expiresAt: new Date(now.getTime() + 1000) })], now)).toHaveLength(1);
  });

  it("n'envoie pas un second rappel avant 14 jours", () => {
    expect(selectInactivityReminders([candidate({ lastReminderAt: daysAgo(13) })], now)).toEqual([]);
  });

  it("renvoie un rappel après 14 jours si l'apprenant reste inactif", () => {
    const reminder = daysAgo(14);
    const result = selectInactivityReminders([candidate({ lastReminderAt: reminder })], now);
    expect(result).toHaveLength(1);
    expect(result[0]?.previousReminderAt).toEqual(reminder);
  });

  it("ignore une date de dernière activité invalide", () => {
    expect(selectInactivityReminders([candidate({ lastActivityAt: new Date("nope") })], now)).toEqual([]);
  });

  it("traite une liste mixte", () => {
    const result = selectInactivityReminders(
      [
        candidate({ enrollmentId: "a" }),
        candidate({ enrollmentId: "b", status: EnrollmentStatus.SUSPENDED }),
        candidate({ enrollmentId: "c", lastReminderAt: daysAgo(2) }),
        candidate({ enrollmentId: "d", lastActivityAt: daysAgo(30) }),
      ],
      now,
    );
    expect(result.map((r) => r.enrollmentId)).toEqual(["a", "d"]);
  });
});
