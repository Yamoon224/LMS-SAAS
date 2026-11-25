"use client";

import { History, Pencil, Percent } from "lucide-react";
import { useMemo, useState } from "react";

import type { CommissionRule } from "../schemas/commission-rule.schema";
import { COMMISSION_SCOPE_LABELS, COMMISSION_TYPE_LABELS, isRuleCurrent } from "../schemas/commission-rule.schema";

import { EditCommissionRuleDialog } from "./EditCommissionRuleDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useCommissionRules } from "@/features/commission-rules/hooks/useCommissionRules";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatDate } from "@/lib/format";

export function CommissionRuleList({ toolbarActions }: { toolbarActions?: React.ReactNode }) {
  const { data: rules, isLoading, isError, error, refetch } = useCommissionRules();
  const { data: plans } = usePlans();
  const { data: tenants } = useTenants();
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<CommissionRule | null>(null);

  // Par défaut, seules les règles en vigueur ; l'historique ajoute les versions remplacées.
  const visibleRules = useMemo(() => (showHistory ? rules : rules?.filter((rule) => isRuleCurrent(rule))), [rules, showHistory]);

  function scopeTarget(rule: CommissionRule): string {
    if (rule.scope === "TENANT" && rule.tenantId) {
      return tenants?.find((tenant) => tenant.id === rule.tenantId)?.name ?? rule.tenantId;
    }
    if (rule.scope === "PLAN" && rule.planId) {
      return plans?.find((plan) => plan.id === rule.planId)?.name ?? rule.planId;
    }
    if (rule.scope === "COURSE") return rule.courseId ?? "—";
    return "—";
  }

  const rate = (rule: CommissionRule) => (rule.percentRate !== null ? `${rule.percentRate} %` : "—");
  const fixed = (rule: CommissionRule) => (rule.fixedAmount !== null ? String(rule.fixedAmount) : "—");

  const columns: DataTableColumn<CommissionRule>[] = [
    {
      id: "scope",
      header: "Portée",
      accessor: (rule) => COMMISSION_SCOPE_LABELS[rule.scope],
      cell: (rule) => <Badge variant="outline">{COMMISSION_SCOPE_LABELS[rule.scope]}</Badge>,
    },
    {
      id: "target",
      header: "Cible",
      accessor: (rule) => scopeTarget(rule),
      cell: (rule) => <span className="text-muted-foreground">{scopeTarget(rule)}</span>,
    },
    {
      id: "type",
      header: "Type de vente",
      accessor: (rule) => COMMISSION_TYPE_LABELS[rule.type],
      cell: (rule) => COMMISSION_TYPE_LABELS[rule.type],
      mobile: "primary",
    },
    {
      id: "rate",
      header: "Taux",
      accessor: (rule) => rule.percentRate,
      cell: rate,
    },
    {
      id: "validFrom",
      header: "En vigueur depuis",
      accessor: (rule) => rule.validFrom,
      exportValue: (rule) => formatDate(rule.validFrom),
      cell: (rule) => <span className="text-muted-foreground">{formatDate(rule.validFrom)}</span>,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (rule) => (isRuleCurrent(rule) ? "En vigueur" : "Remplacée"),
      cell: (rule) =>
        isRuleCurrent(rule) ? (
          <Badge variant="success">En vigueur</Badge>
        ) : (
          <Badge variant="secondary" title={`Remplacée le ${formatDate(rule.validUntil)}`}>
            Remplacée
          </Badge>
        ),
    },
    {
      id: "fixed",
      header: "Montant fixe",
      accessor: (rule) => rule.fixedAmount,
      cell: fixed,
    },
  ];

  return (
    <>
    <DataTable
      data={visibleRules}
      columns={columns}
      getRowId={(rule) => rule.id}
      isLoading={isLoading}
      error={isError ? error : undefined}
      onRetry={() => void refetch()}
      errorTitle="Impossible de charger les règles de commission."
      title="regles-commission"
      searchPlaceholder="Rechercher une règle…"
      stateKey="commission-rules"
      toolbarActions={toolbarActions}
      filters={
        <Button
          type="button"
          variant="outline"
          aria-pressed={showHistory}
          onClick={() => setShowHistory((value) => !value)}
          className={showHistory ? "border-brand text-brand" : undefined}
        >
          <History className="h-4 w-4" aria-hidden="true" /> Historique
        </Button>
      }
      rowActions={(rule) =>
        isRuleCurrent(rule) ? (
          <RowActions label={`Actions pour la règle ${COMMISSION_TYPE_LABELS[rule.type]} (${scopeTarget(rule)})`}>
            <DropdownMenuItem onSelect={() => setEditing(rule)}>
              <Pencil /> Modifier
            </DropdownMenuItem>
          </RowActions>
        ) : null
      }
      emptyState={
        <EmptyState
          icon={Percent}
          message="Aucune règle de commission définie. Sans règle, aucune commission n’est prélevée sur les ventes."
        />
      }
    />
    <EditCommissionRuleDialog rule={editing} target={editing ? scopeTarget(editing) : "—"} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}
