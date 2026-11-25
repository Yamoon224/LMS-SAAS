"use client";

import { useState } from "react";

import { PlanCard } from "./PlanCard";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentSubscription, usePublicPlans } from "@/features/subscription/hooks/useSubscription";
import { BILLING_PERIOD_LABELS } from "@/features/subscription/schemas/subscription.schema";
import type { BillingPeriod } from "@/features/subscription/schemas/subscription.schema";

const PERIODS: BillingPeriod[] = ["MONTHLY", "QUARTERLY", "YEARLY"];

/** ENT-01 : comparatif des plans publics avec choix de la périodicité. */
export function PlanComparison() {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const plans = usePublicPlans();
  const subscription = useCurrentSubscription();

  if (plans.isLoading) return <Skeleton className="h-64" />;
  if (plans.isError || !plans.data) return <ErrorBanner title="Impossible de charger les plans." error={plans.error} />;

  const currentPriceId = subscription.data?.planPriceId;
  const currentPrice = plans.data.flatMap((plan) => plan.prices).find((price) => price.id === currentPriceId);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="plans-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="plans-title" className="text-lg font-semibold">
          Plans disponibles
        </h2>
        <div role="group" aria-label="Périodicité" className="inline-flex rounded-md border border-border p-0.5">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={`rounded px-3 py-1 text-sm ${period === value ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {BILLING_PERIOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.data.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            period={period}
            currentPrice={currentPrice}
            currentPriceId={currentPriceId}
            hasSubscription={Boolean(subscription.data)}
          />
        ))}
      </div>
    </section>
  );
}
