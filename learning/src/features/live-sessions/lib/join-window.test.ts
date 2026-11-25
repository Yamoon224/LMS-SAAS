import { describe, expect, it } from "vitest";

import { calendarHref, joinState, msUntilNextJoinChange } from "./join-window";

const session = { startAt: "2026-12-01T10:00:00.000Z", durationMinutes: 60, status: "SCHEDULED" };
const at = (iso: string) => new Date(iso).getTime();

describe("joinState", () => {
  it("est fermé avant T-15 min, ouvert de T-15 min à la fin, fermé ensuite", () => {
    expect(joinState(session, at("2026-12-01T09:44:59Z"))).toBe("later");
    expect(joinState(session, at("2026-12-01T09:45:00Z"))).toBe("open");
    expect(joinState({ ...session, status: "IN_PROGRESS" }, at("2026-12-01T10:59:59Z"))).toBe("open");
    expect(joinState(session, at("2026-12-01T11:00:00Z"))).toBe("ended");
  });

  it("une session annulée ou terminée n'est jamais ouverte", () => {
    expect(joinState({ ...session, status: "CANCELED" }, at("2026-12-01T10:10:00Z"))).toBe("ended");
    expect(joinState({ ...session, status: "COMPLETED" }, at("2026-12-01T10:10:00Z"))).toBe("ended");
  });

  it("traite une date invalide comme terminée", () => {
    expect(joinState({ ...session, startAt: "nope" }, Date.now())).toBe("ended");
  });
});

describe("msUntilNextJoinChange", () => {
  it("donne le délai jusqu'à l'ouverture, puis jusqu'à la fermeture, puis null", () => {
    expect(msUntilNextJoinChange(session, at("2026-12-01T09:00:00Z"))).toBe(45 * 60_000);
    expect(msUntilNextJoinChange(session, at("2026-12-01T10:00:00Z"))).toBe(60 * 60_000);
    expect(msUntilNextJoinChange(session, at("2026-12-01T12:00:00Z"))).toBeNull();
  });
});

describe("calendarHref", () => {
  it("encode l'identifiant", () => {
    expect(calendarHref("a/b c")).toBe("/api/backend/public/live-sessions/a%2Fb%20c/calendar.ics");
  });
});
