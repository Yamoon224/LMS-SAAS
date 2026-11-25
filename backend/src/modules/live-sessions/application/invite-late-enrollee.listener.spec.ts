import { EnrollmentActivatedEvent } from "@modules/enrollments/enrollments.events";
import type { UsersFacade } from "@modules/users/users.facade";

import { LiveSessionStatus } from "../domain/live-session-status";
import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import type { VideoConferenceProviderPort } from "../domain/video-conference-provider.port";

import { InviteLateEnrolleeListener } from "./invite-late-enrollee.listener";
import { buildLiveSession } from "./live-session-test-helpers";

describe("InviteLateEnrolleeListener (ENT-55)", () => {
  const event = new EnrollmentActivatedEvent("e1", "u1", "c1");

  function build(sessions: ReturnType<typeof buildLiveSession>[], user: { email: string } | null = { email: "a@ex.com" }) {
    const repo = { listByCourse: jest.fn().mockResolvedValue(sessions) } as unknown as LiveSessionRepositoryPort;
    const provider = { addAttendees: jest.fn().mockResolvedValue(undefined) } as unknown as VideoConferenceProviderPort;
    const users = { findById: jest.fn().mockResolvedValue(user) } as unknown as UsersFacade;
    return { listener: new InviteLateEnrolleeListener(repo, provider, users), provider, users, repo };
  }

  it("ajoute l'apprenant aux sessions planifiées ayant un lien Meet et un événement Google", async () => {
    const { listener, provider, repo } = build([
      buildLiveSession({ id: "a", meetLink: "https://meet/a", googleEventId: "ga" }),
      buildLiveSession({ id: "b", meetLink: "https://meet/b", googleEventId: "gb" }),
    ]);
    await listener.handle(event);
    expect(repo.listByCourse).toHaveBeenCalledWith("c1");
    expect(provider.addAttendees).toHaveBeenCalledTimes(2);
    expect(provider.addAttendees).toHaveBeenCalledWith("ga", ["a@ex.com"]);
    expect(provider.addAttendees).toHaveBeenCalledWith("gb", ["a@ex.com"]);
  });

  it("ignore les sessions non planifiées ou sans lien et ne cherche pas l'utilisateur", async () => {
    const { listener, provider, users } = build([
      buildLiveSession({ status: LiveSessionStatus.COMPLETED, meetLink: "https://m", googleEventId: "g" }),
      buildLiveSession({ meetLink: null }),
    ]);
    await listener.handle(event);
    expect(users.findById).not.toHaveBeenCalled();
    expect(provider.addAttendees).not.toHaveBeenCalled();
  });

  it("n'invite personne si l'apprenant est introuvable", async () => {
    const { listener, provider } = build([buildLiveSession({ meetLink: "https://m", googleEventId: "g" })], null);
    await listener.handle(event);
    expect(provider.addAttendees).not.toHaveBeenCalled();
  });

  it("saute les sessions sans identifiant d'événement Google", async () => {
    const { listener, provider } = build([
      buildLiveSession({ meetLink: "https://m", googleEventId: null }),
      buildLiveSession({ meetLink: "https://m", googleEventId: "g2" }),
    ]);
    await listener.handle(event);
    expect(provider.addAttendees).toHaveBeenCalledTimes(1);
    expect(provider.addAttendees).toHaveBeenCalledWith("g2", ["a@ex.com"]);
  });
});
