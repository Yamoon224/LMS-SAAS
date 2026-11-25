import type { EventEmitter2 } from "@nestjs/event-emitter";
import { ForbiddenActionError, NotFoundDomainError } from "@shared/errors";

import type { PlanPriceSelection, SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

import { ChangePlanUseCase } from "./change-plan.use-case";
import { SubscribeToPlanUseCase } from "./subscribe-to-plan.use-case";

function price(overrides: Partial<PlanPriceSelection> = {}): PlanPriceSelection {
  return {
    id: "pp-1",
    planIsPublic: true,
    planIsArchived: false,
    isActive: true,
    amount: 10000,
    currency: "XOF",
    period: "MONTHLY",
    trialDays: 0,
    ...overrides,
  };
}

function repositoryWith(options: {
  prices?: Record<string, PlanPriceSelection>;
  active?: unknown;
  latest?: unknown;
}) {
  const created = { id: "sub-1", status: "PENDING_PAYMENT", startTrial: jest.fn(), toSnapshot: jest.fn() };
  return {
    findPlanPriceSelection: jest.fn().mockImplementation(async (id: string) => options.prices?.[id] ?? null),
    findActiveForTenant: jest.fn().mockResolvedValue(options.active ?? null),
    findLatestForTenant: jest.fn().mockResolvedValue(options.latest ?? null),
    create: jest.fn().mockResolvedValue(created),
    save: jest.fn(),
  } as unknown as SubscriptionRepositoryPort;
}

const emitter = { emit: jest.fn() } as unknown as EventEmitter2;

describe("SubscribeToPlanUseCase - plan eligibility", () => {
  const base = { tenantId: "tenant-1", planPriceId: "pp-1", startWithTrial: false };

  it("refuses an unknown price (404)", async () => {
    const repository = repositoryWith({});
    await expect(new SubscribeToPlanUseCase(repository, emitter).execute({ ...base, selfService: true })).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("refuses a private plan in self-service (same 404)", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price({ planIsPublic: false }) } });
    await expect(new SubscribeToPlanUseCase(repository, emitter).execute({ ...base, selfService: true })).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("refuses an archived plan or inactive price in self-service", async () => {
    for (const overrides of [{ planIsArchived: true }, { isActive: false }]) {
      const repository = repositoryWith({ prices: { "pp-1": price(overrides) } });
      await expect(
        new SubscribeToPlanUseCase(repository, emitter).execute({ ...base, selfService: true }),
      ).rejects.toThrow(NotFoundDomainError);
    }
  });

  it("lets an administrator assign a private plan", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price({ planIsPublic: false }) } });
    await new SubscribeToPlanUseCase(repository, emitter).execute(base);
    expect(repository.create).toHaveBeenCalled();
  });

  it("accepts a public plan in self-service", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price() } });
    await new SubscribeToPlanUseCase(repository, emitter).execute({ ...base, selfService: true });
    expect(repository.create).toHaveBeenCalled();
  });
});

describe("SubscribeToPlanUseCase - trial eligibility in self-service", () => {
  const input = { tenantId: "tenant-1", planPriceId: "pp-1", startWithTrial: true, selfService: true };

  it("refuses a trial on a price that offers none", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price({ trialDays: 0 }) } });
    await expect(new SubscribeToPlanUseCase(repository, emitter).execute(input)).rejects.toThrow(ForbiddenActionError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("refuses a second trial for a tenant that already had a subscription", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price({ trialDays: 14 }) }, latest: { id: "old" } });
    await expect(new SubscribeToPlanUseCase(repository, emitter).execute(input)).rejects.toThrow(ForbiddenActionError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("grants the trial for a first-time tenant, using the price's trial length", async () => {
    const repository = repositoryWith({ prices: { "pp-1": price({ trialDays: 7 }) } });
    await new SubscribeToPlanUseCase(repository, emitter).execute(input);
    const created = await (repository.create as jest.Mock).mock.results[0]?.value;
    expect(created.startTrial).toHaveBeenCalledTimes(1);
    const trialEnd: Date = created.startTrial.mock.calls[0][0];
    const days = Math.round((trialEnd.getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(7);
  });
});

describe("ChangePlanUseCase - plan eligibility and server-side upgrade decision", () => {
  function build(prices: Record<string, PlanPriceSelection>) {
    const subscription = {
      id: "sub-1",
      planPriceId: "pp-current",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 15 * 86_400_000),
      pendingChangeAt: null,
      changePlanPrice: jest.fn(),
      activeDiscount: () => null,
      schedulePlanChange: jest.fn(),
      cancelPendingPlanChange: jest.fn(),
    };
    const repository = repositoryWith({ prices, active: subscription });
    return { subscription, repository, useCase: new ChangePlanUseCase(repository, emitter) };
  }
  const current = price({ id: "pp-current", amount: 10000 });

  it("refuses a private target plan in self-service", async () => {
    const { subscription, useCase } = build({
      "pp-current": current,
      "pp-private": price({ id: "pp-private", planIsPublic: false, amount: 99999 }),
    });
    await expect(
      useCase.execute({ tenantId: "t", newPlanPriceId: "pp-private", isUpgrade: true, selfService: true }),
    ).rejects.toThrow(NotFoundDomainError);
    expect(subscription.changePlanPrice).not.toHaveBeenCalled();
  });

  it("applies a real upgrade immediately", async () => {
    const { subscription, useCase } = build({
      "pp-current": current,
      "pp-big": price({ id: "pp-big", amount: 50000 }),
    });
    await expect(
      useCase.execute({ tenantId: "t", newPlanPriceId: "pp-big", isUpgrade: true, selfService: true }),
    ).resolves.toMatchObject({ immediate: true });
    expect(subscription.changePlanPrice).toHaveBeenCalledWith("pp-big");
  });

  it("does NOT trust isUpgrade=true when the target is cheaper (deferred instead)", async () => {
    const { subscription, useCase } = build({
      "pp-current": current,
      "pp-cheap": price({ id: "pp-cheap", amount: 0 }),
    });
    await expect(
      useCase.execute({ tenantId: "t", newPlanPriceId: "pp-cheap", isUpgrade: true, selfService: true }),
    ).resolves.toMatchObject({ immediate: false });
    expect(subscription.changePlanPrice).not.toHaveBeenCalled();
  });

  it("compares prices per month (yearly price lower per month is not an upgrade)", async () => {
    const { subscription, useCase } = build({
      "pp-current": current,
      "pp-year": price({ id: "pp-year", amount: 60000, period: "YEARLY" }),
    });
    await expect(
      useCase.execute({ tenantId: "t", newPlanPriceId: "pp-year", isUpgrade: true, selfService: true }),
    ).resolves.toMatchObject({ immediate: false });
    expect(subscription.changePlanPrice).not.toHaveBeenCalled();
  });

  it("keeps the caller-provided flag for administrator calls (no self-service)", async () => {
    const { subscription, useCase } = build({
      "pp-current": current,
      "pp-cheap": price({ id: "pp-cheap", amount: 0 }),
    });
    await useCase.execute({ tenantId: "t", newPlanPriceId: "pp-cheap", isUpgrade: true });
    expect(subscription.changePlanPrice).toHaveBeenCalledWith("pp-cheap");
  });
});
