import {
  assertCanJoinLiveSession,
  canJoinLiveSession,
  joinWindow,
  LiveSessionNotJoinableError,
} from "./live-session-join-window";

const start = new Date("2026-12-01T10:00:00.000Z");
const session = { startAt: start, durationMinutes: 60, status: "SCHEDULED" };
const at = (iso: string) => new Date(iso);

describe("canJoinLiveSession", () => {
  it("est fermé plus de 15 minutes avant le début", () => {
    expect(canJoinLiveSession(session, at("2026-12-01T09:44:59.000Z"))).toBe(false);
  });

  it("s'ouvre exactement 15 minutes avant le début", () => {
    expect(canJoinLiveSession(session, at("2026-12-01T09:45:00.000Z"))).toBe(true);
  });

  it("reste ouvert pendant la session (statut en cours)", () => {
    expect(canJoinLiveSession({ ...session, status: "IN_PROGRESS" }, at("2026-12-01T10:30:00.000Z"))).toBe(true);
  });

  it("se ferme à la fin de la session", () => {
    expect(canJoinLiveSession(session, at("2026-12-01T10:59:59.000Z"))).toBe(true);
    expect(canJoinLiveSession(session, at("2026-12-01T11:00:00.000Z"))).toBe(false);
  });

  it("n'ouvre jamais une session annulée ou terminée", () => {
    expect(canJoinLiveSession({ ...session, status: "CANCELED" }, at("2026-12-01T10:10:00.000Z"))).toBe(false);
    expect(canJoinLiveSession({ ...session, status: "COMPLETED" }, at("2026-12-01T10:10:00.000Z"))).toBe(false);
  });

  it("refuse une date invalide ou une durée nulle", () => {
    expect(canJoinLiveSession({ ...session, startAt: new Date("nope") }, start)).toBe(false);
    expect(canJoinLiveSession(session, new Date("nope"))).toBe(false);
    expect(canJoinLiveSession({ ...session, durationMinutes: 0 }, at("2026-12-01T10:00:00.000Z"))).toBe(false);
  });

  it("calcule la fenêtre", () => {
    const window = joinWindow(session);
    expect(window.opensAt.toISOString()).toBe("2026-12-01T09:45:00.000Z");
    expect(window.closesAt.toISOString()).toBe("2026-12-01T11:00:00.000Z");
  });
});

describe("assertCanJoinLiveSession", () => {
  it("lève une erreur métier hors fenêtre", () => {
    expect(() => assertCanJoinLiveSession(session, at("2026-12-01T08:00:00.000Z"))).toThrow(
      LiveSessionNotJoinableError,
    );
  });

  it("ne lève rien dans la fenêtre", () => {
    expect(() => assertCanJoinLiveSession(session, at("2026-12-01T10:05:00.000Z"))).not.toThrow();
  });
});
