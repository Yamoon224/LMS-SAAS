import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { CreditPackRecord, CreditPackRepositoryPort } from "../domain/credit-pack.repository.port";
import { BillingPeriod } from "../domain/billing-period";
import type { PlanFeatureRepositoryPort } from "../domain/plan-feature.repository.port";
import type { PlanQuotaRepositoryPort } from "../domain/plan-quota.repository.port";
import { Plan } from "../domain/plan.entity";
import type { PlanRepositoryPort } from "../domain/plan.repository.port";
import { PlanArchivedEvent } from "../plans.events";

import { ArchivePlanUseCase } from "./archive-plan.use-case";
import { CheckQuotaUseCase } from "./check-quota.use-case";
import { CreatePlanUseCase } from "./create-plan.use-case";
import { GetPlanFeaturesUseCase } from "./get-plan-features.use-case";
import { ListPlansUseCase } from "./list-plans.use-case";
import { ManageCreditPacksUseCase } from "./manage-credit-packs.use-case";
import { ResolveCommissionUseCase } from "./resolve-commission.use-case";
import { SetPlanPriceUseCase } from "./set-plan-price.use-case";

const plan = (isArchived = false) =>
  Plan.fromPersistence({
    id: "p1",
    name: "Starter",
    description: null,
    isPublic: true,
    isArchived,
    quotas: {},
    features: {},
    commissionRatePercent: null,
    prices: [],
  });

describe("ArchivePlanUseCase — plan introuvable", () => {
  it("lève NotFound à l'archivage et au désarchivage, sans événement", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null), archive: jest.fn(), unarchive: jest.fn() };
    const emitter = { emit: jest.fn() };
    const useCase = new ArchivePlanUseCase(repository as unknown as PlanRepositoryPort, emitter as unknown as EventEmitter2);

    await expect(useCase.execute("p1", "admin")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.restore("p1", "admin")).rejects.toThrow(NotFoundDomainError);
    expect(repository.archive).not.toHaveBeenCalled();
    expect(repository.unarchive).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("archive un plan actif et émet plan.archived (archived = true)", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(plan(false)), archive: jest.fn() };
    const emitter = { emit: jest.fn() };
    await new ArchivePlanUseCase(repository as unknown as PlanRepositoryPort, emitter as unknown as EventEmitter2).execute(
      "p1",
      "admin",
    );
    expect(repository.archive).toHaveBeenCalledWith("p1");
    expect(emitter.emit).toHaveBeenCalledWith("plan.archived", new PlanArchivedEvent("p1", "admin", true));
  });

  it("désarchive un plan archivé et émet plan.archived (archived = false)", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(plan(true)), unarchive: jest.fn() };
    const emitter = { emit: jest.fn() };
    await new ArchivePlanUseCase(repository as unknown as PlanRepositoryPort, emitter as unknown as EventEmitter2).restore(
      "p1",
      "admin",
    );
    expect(repository.unarchive).toHaveBeenCalledWith("p1");
    expect(emitter.emit).toHaveBeenCalledWith("plan.archived", new PlanArchivedEvent("p1", "admin", false));
  });
});

describe("CheckQuotaUseCase (BE-03)", () => {
  const run = (limit: number | null, current: number) => {
    const repository: PlanQuotaRepositoryPort = {
      getQuotaLimit: jest.fn().mockResolvedValue(limit),
      getCurrentUsage: jest.fn().mockResolvedValue(current),
    };
    return new CheckQuotaUseCase(repository).execute("t1", "maxCourses");
  };

  it("autorise sous la limite", async () => {
    await expect(run(10, 9)).resolves.toEqual({ withinLimit: true, current: 9, limit: 10 });
  });

  it("refuse quand la limite est atteinte", async () => {
    await expect(run(10, 10)).resolves.toEqual({ withinLimit: false, current: 10, limit: 10 });
  });

  it("autorise toujours quand le quota est illimité (null)", async () => {
    await expect(run(null, 9999)).resolves.toEqual({ withinLimit: true, current: 9999, limit: null });
  });

  it("interroge le repository avec le tenant et le nom du quota", async () => {
    const repository: PlanQuotaRepositoryPort = {
      getQuotaLimit: jest.fn().mockResolvedValue(1),
      getCurrentUsage: jest.fn().mockResolvedValue(0),
    };
    await new CheckQuotaUseCase(repository).execute("t1", "storageGb");
    expect(repository.getQuotaLimit).toHaveBeenCalledWith("t1", "storageGb");
    expect(repository.getCurrentUsage).toHaveBeenCalledWith("t1", "storageGb");
  });
});

describe("CreatePlanUseCase", () => {
  it("délègue la création au repository et retourne le plan", async () => {
    const created = plan();
    const repository = { create: jest.fn().mockResolvedValue(created) };
    const input = { name: "Pro", isPublic: false, quotas: { maxCourses: 5 }, features: { aiTranslation: true } };
    await expect(new CreatePlanUseCase(repository as unknown as PlanRepositoryPort).execute(input)).resolves.toBe(created);
    expect(repository.create).toHaveBeenCalledWith(input);
  });
});

describe("GetPlanFeaturesUseCase (ADM-14)", () => {
  it("retourne les features du plan actif, ou un objet vide sans plan", async () => {
    const getFeaturesForTenant = jest
      .fn()
      .mockResolvedValueOnce({ aiTranslation: true })
      .mockResolvedValueOnce(null);
    const useCase = new GetPlanFeaturesUseCase({ getFeaturesForTenant } as PlanFeatureRepositoryPort);
    await expect(useCase.execute("t1")).resolves.toEqual({ aiTranslation: true });
    await expect(useCase.execute("t2")).resolves.toEqual({});
    expect(getFeaturesForTenant).toHaveBeenLastCalledWith("t2");
  });
});

describe("ListPlansUseCase", () => {
  it("liste les plans publics ou tous les plans selon la vue", async () => {
    const publicPlans = [plan()];
    const allPlans = [plan(), plan(true)];
    const repository = {
      listPublic: jest.fn().mockResolvedValue(publicPlans),
      listAll: jest.fn().mockResolvedValue(allPlans),
    };
    const useCase = new ListPlansUseCase(repository as unknown as PlanRepositoryPort);
    await expect(useCase.listPublic()).resolves.toBe(publicPlans);
    await expect(useCase.listAll()).resolves.toBe(allPlans);
  });
});

describe("ManageCreditPacksUseCase (ADM-18)", () => {
  const pack: CreditPackRecord = {
    id: "pk1",
    name: "Pack S",
    creditsAmount: 100,
    price: 5000,
    currency: "XOF",
    isArchived: false,
  };

  function setup(found: CreditPackRecord | null = pack) {
    const repository = {
      findById: jest.fn().mockResolvedValue(found),
      create: jest.fn().mockResolvedValue(pack),
      archive: jest.fn().mockResolvedValue(undefined),
      listActive: jest.fn().mockResolvedValue([pack]),
      listAll: jest.fn().mockResolvedValue([pack]),
    };
    return { repository, useCase: new ManageCreditPacksUseCase(repository as unknown as CreditPackRepositoryPort) };
  }

  it("crée un pack", async () => {
    const { useCase, repository } = setup();
    const data = { name: "Pack S", creditsAmount: 100, price: 5000, currency: "XOF" };
    await expect(useCase.create(data)).resolves.toBe(pack);
    expect(repository.create).toHaveBeenCalledWith(data);
  });

  it("archive un pack existant", async () => {
    const { useCase, repository } = setup();
    await useCase.archive("pk1");
    expect(repository.archive).toHaveBeenCalledWith("pk1");
  });

  it("lève NotFound à l'archivage d'un pack inconnu", async () => {
    const { useCase, repository } = setup(null);
    await expect(useCase.archive("absent")).rejects.toThrow(NotFoundDomainError);
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it("liste les packs actifs ou tous les packs", async () => {
    const { useCase, repository } = setup();
    await expect(useCase.listActive()).resolves.toEqual([pack]);
    await expect(useCase.listAll()).resolves.toEqual([pack]);
    expect(repository.listActive).toHaveBeenCalledTimes(1);
    expect(repository.listAll).toHaveBeenCalledTimes(1);
  });
});

describe("ResolveCommissionUseCase (BE-06 / RG-27)", () => {
  it("retourne le taux et le montant fixe de la règle applicable", async () => {
    const resolveApplicableRule = jest.fn().mockResolvedValue({ percentRate: 12, fixedAmount: 200 });
    const useCase = new ResolveCommissionUseCase({ resolveApplicableRule } as never);
    await expect(useCase.execute("ONLINE", "t1", "c1")).resolves.toEqual({ percentRate: 12, fixedAmount: 200 });
    expect(resolveApplicableRule).toHaveBeenCalledWith("ONLINE", "t1", { courseId: "c1" });
  });

  it("retourne des valeurs nulles quand aucune règle ne s'applique", async () => {
    const resolveApplicableRule = jest.fn().mockResolvedValue(null);
    const useCase = new ResolveCommissionUseCase({ resolveApplicableRule } as never);
    await expect(useCase.execute("OFFLINE", "t1")).resolves.toEqual({ percentRate: null, fixedAmount: null });
    expect(resolveApplicableRule).toHaveBeenCalledWith("OFFLINE", "t1", { courseId: undefined });
  });
});

describe("SetPlanPriceUseCase (ADM-17)", () => {
  const input = { planId: "p1", period: BillingPeriod.YEARLY, currency: "XOF", amount: 250000, trialDays: 7 };

  it("ajoute une nouvelle version de prix pour un plan existant", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(plan()), addPriceVersion: jest.fn() };
    await new SetPlanPriceUseCase(repository as unknown as PlanRepositoryPort).execute(input);
    expect(repository.addPriceVersion).toHaveBeenCalledWith(input);
  });

  it("lève NotFound sans écrire pour un plan inconnu", async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null), addPriceVersion: jest.fn() };
    await expect(new SetPlanPriceUseCase(repository as unknown as PlanRepositoryPort).execute(input)).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.addPriceVersion).not.toHaveBeenCalled();
  });
});
