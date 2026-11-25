import { NotFoundDomainError } from "@shared/errors";

import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";

import type { AuthorizeLearnerLiveSessionUseCase } from "./authorize-learner-live-session.use-case";
import { GetLiveSessionCalendarUseCase } from "./get-live-session-calendar.use-case";

function build(session: Record<string, unknown> | null, authorized = true) {
  const repository = { findById: jest.fn().mockResolvedValue(session) } as unknown as LiveSessionRepositoryPort;
  const authorize = {
    assertSessionAccess: jest.fn().mockImplementation(async () => {
      if (!authorized) throw new NotFoundDomainError("Session live introuvable");
    }),
  } as unknown as AuthorizeLearnerLiveSessionUseCase;
  return new GetLiveSessionCalendarUseCase(repository, authorize);
}

const session = {
  id: "11111111-2222-3333-4444-555555555555",
  title: "Cours, partie 1\r\nX-EVIL:1",
  startAt: new Date("2026-12-01T10:00:00Z"),
  durationMinutes: 60,
  status: "SCHEDULED",
  meetLink: "https://meet.example/x",
};

describe("GetLiveSessionCalendarUseCase", () => {
  it("génère un .ics avec un nom de fichier dérivé de l'identifiant seulement", async () => {
    const file = await build(session).execute("ls", "u", "t");
    expect(file.filename).toBe("session-11111111-2222-3333-4444-555555555555.ics");
    expect(file.content).toContain("SUMMARY:Cours\\, partie 1\\nX-EVIL:1");
    expect(file.content.split("\r\n")).not.toContain("X-EVIL:1");
  });

  it("refuse (404) un apprenant sans accès", async () => {
    await expect(build(session, false).execute("ls", "u", "t")).rejects.toThrow(NotFoundDomainError);
  });

  it("refuse (404) une session annulée ou inconnue", async () => {
    await expect(build({ ...session, status: "CANCELED" }).execute("ls", "u", "t")).rejects.toThrow(NotFoundDomainError);
    await expect(build(null).execute("ls", "u", "t")).rejects.toThrow(NotFoundDomainError);
  });

  it("executeForTenant : refuse une session d'un autre tenant, accepte la sienne", async () => {
    const own = { ...session, tenantId: "t1", timezone: "Africa/Abidjan" };
    const file = await build(own).executeForTenant("ls", "t1");
    expect(file.content).toContain("X-WR-TIMEZONE:Africa/Abidjan");
    await expect(build(own).executeForTenant("ls", "autre")).rejects.toThrow(NotFoundDomainError);
  });
});
