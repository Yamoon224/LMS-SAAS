import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionRuleList } from "@/features/commission-rules/components/CommissionRuleList";
import { CreateCommissionRuleDialog } from "@/features/commission-rules/components/CreateCommissionRuleDialog";
import { CreateCreditPackDialog } from "@/features/credit-packs/components/CreateCreditPackDialog";
import { CreditPackList } from "@/features/credit-packs/components/CreditPackList";
import { PlanList } from "@/features/plans/components/PlanList";

export const metadata: Metadata = {
  title: "Plans tarifaires",
};

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plans & tarification"
        description="Plans tarifaires, règles de commission et packs de crédits IA."
      />

      <RequirePermission permission="plans.manage">
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="commission-rules">Règles de commission</TabsTrigger>
            <TabsTrigger value="credit-packs">Packs de crédits IA</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <PlanList
              toolbarActions={
                <Button asChild>
                  <Link href="/plans/new">
                    <Plus className="h-4 w-4" />
                    Nouveau plan
                  </Link>
                </Button>
              }
            />
          </TabsContent>

          <TabsContent value="commission-rules">
            <CommissionRuleList toolbarActions={<CreateCommissionRuleDialog />} />
          </TabsContent>

          <TabsContent value="credit-packs">
            <CreditPackList toolbarActions={<CreateCreditPackDialog />} />
          </TabsContent>
        </Tabs>
      </RequirePermission>
    </div>
  );
}
