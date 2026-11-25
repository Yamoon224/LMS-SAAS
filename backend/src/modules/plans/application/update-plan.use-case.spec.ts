import type { EventEmitter2 } from "@nestjs/event-emitter";

import { Plan } from "../domain/plan.entity";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";

import { ArchivePlanUseCase } from "./archive-plan.use-case";
import { normalizeFeatures, normalizeQuotas, UpdatePlanUseCase } from "./update-plan.use-case";

function setup(archived = false) {
  let plan = Plan.fromPersistence({
    id: "p1",
    name: "Starter",
    description: "Pour démarrer",
    isPublic: true,
    isArchived: archived,
    quotas: { maxCourses: 10 },
    features: { aiTranslation: false },
    commissionRatePercent: null,
    prices: [],
  });
  const update = jest.fn(async () => undefined);
  const archive = jest.fn(async () => {
    plan = Plan.fromPersistence({ ...plan, isArchived: true } as never);
  });
  const unarchive = jest.fn(async () => undefined);
  const repository = {
    findById: async (id: string) => (id === "p1" ? plan : null),
    update,
    archive,
    unarchive,
  } as unknown as PlanRepositoryPort;
  const events: Array<{ name: string; payload: unknown }> = [];
  const emitter = { emit: (name: string, payload: unknown) => events.push({ name, payload }) } as unknown as EventEmitter2;
  return { repository, emitter, events, update, unarchive };
}

describe("ADM-13 : modifier un plan", () => {
  it("met à jour nom, description, quotas et fonctionnalités, et n'émet que les champs touchés", async () => {
    const ctx = setup();
    await new UpdatePlanUseCase(ctx.repository, ctx.emitter).execute({
      planId: "p1",
      actorId: "admin",
      name: "  Starter+ ",
      description: null,
      quotas: { maxCourses: 25, storageGb: 50, maxManagers: null as never },
      features: { aiTranslation: true, aiTranslationCreditsIncluded: 100 },
    });
    expect(ctx.update).toHaveBeenCalledWith("p1", {
      name: "Starter+",
      description: null,
      quotas: { maxCourses: 25, storageGb: 50 },
      features: { aiTranslation: true, aiTranslationCreditsIncluded: 100 },
    });
    expect(ctx.events[0]).toMatchObject({
      name: "plan.updated",
      payload: { planId: "p1", actorId: "admin", changedFields: ["name", "description", "quotas", "features"] },
    });
  });

  it("ne fait rien (ni écriture ni événement) si rien ne change", async () => {
    const ctx = setup();
    await new UpdatePlanUseCase(ctx.repository, ctx.emitter).execute({ planId: "p1", actorId: "a", name: "Starter", description: "Pour démarrer" });
    expect(ctx.update).not.toHaveBeenCalled();
    expect(ctx.events).toHaveLength(0);
  });

  it("refuse un plan inconnu, un nom trop court, des quotas ou fonctionnalités invalides", async () => {
    const ctx = setup();
    const useCase = new UpdatePlanUseCase(ctx.repository, ctx.emitter);
    await expect(useCase.execute({ planId: "nope", actorId: "a", name: "Autre" })).rejects.toThrow();
    await expect(useCase.execute({ planId: "p1", actorId: "a", name: "X" })).rejects.toMatchObject({ code: "MODIFICATION_PLAN_INVALIDE" });
    await expect(useCase.execute({ planId: "p1", actorId: "a", quotas: { maxCourses: -1 } })).rejects.toThrow();
    expect(() => normalizeQuotas({ maxCourses: 1.5 })).toThrow();
    expect(() => normalizeQuotas({ bogus: 1 } as never)).toThrow();
    expect(() => normalizeFeatures({ aiTranslation: "oui" } as never)).toThrow();
    expect(() => normalizeFeatures({ nope: true } as never)).toThrow();
    expect(ctx.update).not.toHaveBeenCalled();
  });
});

describe("ADM-13 : archivage et désarchivage", () => {
  it("archive (idempotent) et désarchive en journalisant l'acteur", async () => {
    const ctx = setup();
    const useCase = new ArchivePlanUseCase(ctx.repository, ctx.emitter);
    await useCase.execute("p1", "admin");
    expect(ctx.events[0]).toMatchObject({ name: "plan.archived", payload: { archived: true, actorId: "admin" } });
    await useCase.execute("p1", "admin"); // déjà archivé : aucun nouvel événement
    expect(ctx.events).toHaveLength(1);

    await useCase.restore("p1", "admin");
    expect(ctx.unarchive).toHaveBeenCalledWith("p1");
    expect(ctx.events[1]).toMatchObject({ payload: { archived: false } });
  });

  it("le désarchivage d'un plan non archivé est sans effet", async () => {
    const ctx = setup(false);
    await new ArchivePlanUseCase(ctx.repository, ctx.emitter).restore("p1", "a");
    expect(ctx.unarchive).not.toHaveBeenCalled();
  });
});
