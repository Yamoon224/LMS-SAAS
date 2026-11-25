"use client";

import { CurrentSubscriptionCard } from "./CurrentSubscriptionCard";
import { InvoiceHistory } from "./InvoiceHistory";
import { PlanComparison } from "./PlanComparison";
import { RenewalCard } from "./RenewalCard";
import { UsageGauges } from "./UsageGauges";

import { PageHeader } from "@/components/ui/page-header";

/** Abonnement et facturation de l'entreprise (cahier des charges 6.1 : ENT-01, ENT-04, ENT-05, ENT-07). */
export function SubscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Abonnement" description="Votre plan, votre consommation et les plans disponibles." />
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentSubscriptionCard />
        <UsageGauges />
      </div>
      <RenewalCard />
      <PlanComparison />
      <InvoiceHistory />
    </div>
  );
}
