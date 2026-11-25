"use client";

import { useState } from "react";

import { TenantAuditTab } from "./TenantAuditTab";
import { TenantFinancesTab } from "./TenantFinancesTab";
import { TenantOverviewTab } from "./TenantOverviewTab";
import { TenantSubscriptionTab } from "./TenantSubscriptionTab";
import { TenantTabState } from "./TenantTabState";
import { TenantUsageTab } from "./TenantUsageTab";
import { TenantUsersTab } from "./TenantUsersTab";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/features/session/hooks/useSession";
import type { useTenantOverview } from "@/features/tenants/hooks/useTenantOverview";

/** ADM-10 : onglets de la fiche 360° ; Finances et Audit n'apparaissent qu'avec leur permission. */
export function TenantDetailTabs({
  tenantId,
  overviewQuery,
}: {
  tenantId: string;
  overviewQuery: ReturnType<typeof useTenantOverview>;
}) {
  const { can } = usePermissions();
  const [tab, setTab] = useState("overview");
  const canSeeFinances = can("wallet.view-all");
  const canSeeAudit = can("audit.view");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Sections de la fiche entreprise">
        <TabsTrigger value="overview">Aperçu</TabsTrigger>
        <TabsTrigger value="subscription">Abonnement</TabsTrigger>
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="usage">Activité &amp; usage</TabsTrigger>
        {canSeeFinances && <TabsTrigger value="finances">Finances</TabsTrigger>}
        {canSeeAudit && <TabsTrigger value="audit">Journal d’audit</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview">
        <TenantTabState
          query={overviewQuery}
          errorTitle="Impossible de charger l’aperçu de l’entreprise."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter cette entreprise."
        >
          {(overview) => <TenantOverviewTab overview={overview} canReadPayout={can("tenants.read")} />}
        </TenantTabState>
      </TabsContent>
      <TabsContent value="subscription">
        <TenantTabState
          query={overviewQuery}
          errorTitle="Impossible de charger l’abonnement."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter cette entreprise."
        >
          {(overview) => <TenantSubscriptionTab overview={overview} canAssign={can("subscriptions.assign")} />}
        </TenantTabState>
      </TabsContent>
      <TabsContent value="users">
        <TenantUsersTab tenantId={tenantId} active={tab === "users"} />
      </TabsContent>
      <TabsContent value="usage">
        <TenantTabState
          query={overviewQuery}
          errorTitle="Impossible de charger l’usage."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter cette entreprise."
        >
          {(overview) => <TenantUsageTab overview={overview} />}
        </TenantTabState>
      </TabsContent>
      {canSeeFinances && (
        <TabsContent value="finances">
          <TenantFinancesTab tenantId={tenantId} active={tab === "finances"} />
        </TabsContent>
      )}
      {canSeeAudit && (
        <TabsContent value="audit">
          <TenantAuditTab tenantId={tenantId} active={tab === "audit"} />
        </TabsContent>
      )}
    </Tabs>
  );
}
