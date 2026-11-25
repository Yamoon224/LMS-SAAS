import type { CoursesFacade } from "@modules/courses/courses.facade";
import type { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { LiveSessionRepositoryPort } from "../domain/live-session.repository.port";
import type { VideoConferenceProviderPort } from "../domain/video-conference-provider.port";
import { LiveSessionScheduledEvent } from "../live-sessions.events";

import { buildLiveSession } from "./live-session-test-helpers";
import { ScheduleLiveSessionUseCase } from "./schedule-live-session.use-case";

describe("ScheduleLiveSessionUseCase", () => {
  const input = {
    courseId: "c1",
    moduleId: "m1",
    title: "Webinaire",
    startAt: new Date("2026-03-15T10:00:00Z"),
    durationMinutes: 60,
    timezone: "Africa/Abidjan",
    capacity: 20,
  };

  function build(enrollments: Array<{ userId: string; access: boolean }>, users: Record<string, { email: string } | null>) {
    const session = buildLiveSession();
    const repo = {
      create: jest.fn().mockResolvedValue(session),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as LiveSessionRepositoryPort;
    const provider = {
      createEvent: jest.fn().mockResolvedValue({ meetLink: "https://meet/x", providerEventId: "g1" }),
    } as unknown as VideoConferenceProviderPort;
    const courses = { findById: jest.fn().mockResolvedValue({ tenantId: "t1" }) } as unknown as CoursesFacade;
    const enrollmentsFacade = {
      listForCourse: jest
        .fn()
        .mockResolvedValue(enrollments.map((e) => ({ userId: e.userId, hasContentAccess: () => e.access }))),
    } as unknown as EnrollmentsFacade;
    const usersFacade = {
      findById: jest.fn().mockImplementation((id: string) => Promise.resolve(users[id] ?? null)),
    } as unknown as UsersFacade;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const useCase = new ScheduleLiveSessionUseCase(repo, provider, courses, enrollmentsFacade, usersFacade, emitter);
    return { useCase, session, repo, provider, courses, usersFacade, emitter };
  }

  it("crée la session avec le tenant du cours, invite uniquement les inscrits actifs existants et publie l'événement", async () => {
    const { useCase, session, repo, provider, usersFacade, emitter } = build(
      [
        { userId: "u1", access: true },
        { userId: "u2", access: false },
        { userId: "u3", access: true },
      ],
      { u1: { email: "a@ex.com" }, u2: { email: "b@ex.com" }, u3: null },
    );

    const result = await useCase.execute(input);

    expect(result).toBe(session);
    expect(repo.create).toHaveBeenCalledWith({
      tenantId: "t1",
      courseId: "c1",
      moduleId: "m1",
      title: "Webinaire",
      startAt: input.startAt,
      durationMinutes: 60,
      timezone: "Africa/Abidjan",
      capacity: 20,
    });
    expect(usersFacade.findById).toHaveBeenCalledTimes(2);
    expect(provider.createEvent).toHaveBeenCalledWith({
      title: "Webinaire",
      startAt: input.startAt,
      durationMinutes: 60,
      timezone: "Africa/Abidjan",
      attendeeEmails: ["a@ex.com"],
    });
    expect(session.meetLink).toBe("https://meet/x");
    expect(session.toSnapshot().googleEventId).toBe("g1");
    expect(repo.save).toHaveBeenCalledWith(session);
    expect(emitter.emit).toHaveBeenCalledWith(
      "live-session.scheduled",
      new LiveSessionScheduledEvent("s1", "c1", "Webinaire", input.startAt, "https://meet/x"),
    );
  });

  it("envoie une liste d'invités vide quand personne n'est inscrit", async () => {
    const { useCase, provider } = build([], {});
    await useCase.execute(input);
    expect(provider.createEvent).toHaveBeenCalledWith(expect.objectContaining({ attendeeEmails: [] }));
  });
});
