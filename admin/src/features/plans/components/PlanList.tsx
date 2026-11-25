"use client";

import { Archive, ArchiveRestore, Banknote, CirclePlus, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useArchivePlan } from "../hooks/useArchivePlan";
import { usePlans } from "../hooks/usePlans";
import { useUnarchivePlan } from "../hooks/useUnarchivePlan";
import type { Plan } from "../schemas/plan.schema";
import { BILLING_PERIOD_LABELS } from "../schemas/plan.schema";

import { AddPlanPriceDialog } from "./AddPlanPriceDialog";
import { EditPlanDialog } from "./EditPlanDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { formatAmount, formatNumber } from "@/lib/format";

function quotaLabel(value: number | undefined | null): string {
  return value === undefined || value === null ? "Illimité" : formatNumber(value);
}

function quotasText(plan: Plan): string {
  return [
    `Formations : ${quotaLabel(plan.quotas.maxCourses)}`,
    `Apprenants actifs : ${quotaLabel(plan.quotas.maxActiveLearners)}`,
    `Gestionnaires : ${quotaLabel(plan.quotas.maxManagers)}`,
    `Stockage : ${plan.quotas.storageGb === undefined ? "Illimité" : `${plan.quotas.storageGb} Go`}`,
    `Sessions live / mois : ${quotaLabel(plan.quotas.liveSessionsPerMonth)}`,
  ].join(" ; ");
}

function featuresText(plan: Plan): string {
  return [
    `Traduction IA : ${plan.features.aiTranslation ? `Oui (${plan.features.aiTranslationCreditsIncluded ?? 0} crédits)` : "Non"}`,
    `Certificats personnalisés : ${plan.features.customCertificates ? "Oui" : "Non"}`,
    `Domaine personnalisé : ${plan.features.customDomain ? "Oui" : "Non"}`,
  ].join(" ; ");
}

function pricesText(plan: Plan): string {
  const activePrices = plan.prices.filter((price) => price.isActive);
  if (activePrices.length === 0) return "Aucun prix défini";
  return activePrices
    .map((price) => `${BILLING_PERIOD_LABELS[price.period]} : ${formatAmount(price.amount, price.currency)}${price.trialDays > 0 ? ` (essai ${price.trialDays} j)` : ""}`)
    .join(" ; ");
}

function QuotasSummary({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <div>Formations : {quotaLabel(plan.quotas.maxCourses)}</div>
      <div>Apprenants actifs : {quotaLabel(plan.quotas.maxActiveLearners)}</div>
      <div>Gestionnaires : {quotaLabel(plan.quotas.maxManagers)}</div>
      <div>Stockage : {plan.quotas.storageGb === undefined ? "Illimité" : `${plan.quotas.storageGb} Go`}</div>
      <div>Sessions live / mois : {quotaLabel(plan.quotas.liveSessionsPerMonth)}</div>
    </div>
  );
}

function FeaturesSummary({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <div>
        Traduction IA : {plan.features.aiTranslation ? `Oui (${plan.features.aiTranslationCreditsIncluded ?? 0} crédits)` : "Non"}
      </div>
      <div>Certificats personnalisés : {plan.features.customCertificates ? "Oui" : "Non"}</div>
      <div>Domaine personnalisé : {plan.features.customDomain ? "Oui" : "Non"}</div>
    </div>
  );
}

function PricesSummary({ plan }: { plan: Plan }) {
  const activePrices = plan.prices.filter((price) => price.isActive);
  if (activePrices.length === 0) return <span className="text-xs text-muted-foreground">Aucun prix défini</span>;
  return (
    <div className="space-y-0.5 text-xs">
      {activePrices.map((price) => (
        <div key={price.id}>
          {BILLING_PERIOD_LABELS[price.period]} : <span className="font-medium">{formatAmount(price.amount, price.currency)}</span>
          {price.trialDays > 0 && <span className="text-muted-foreground"> (essai {price.trialDays} j)</span>}
        </div>
      ))}
    </div>
  );
}

function PlanBadges({ plan }: { plan: Plan }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={plan.isArchived ? "danger" : "success"}>{plan.isArchived ? "Archivé" : "Actif"}</Badge>
      <Badge variant={plan.isPublic ? "default" : "secondary"}>{plan.isPublic ? "Public" : "Sur mesure"}</Badge>
    </span>
  );
}

/** Liste des plans : tableau (≥ md) ou cartes (mobile), actions dans un menu « ⋯ ». */
export function PlanList({ toolbarActions }: { toolbarActions?: React.ReactNode }) {
  const { data: plans, isLoading, isError, error, refetch } = usePlans();
  const archivePlan = useArchivePlan();
  const [priceFor, setPriceFor] = useState<Plan | null>(null);
  const [archiveFor, setArchiveFor] = useState<Plan | null>(null);
  const [editFor, setEditFor] = useState<Plan | null>(null);
  const [restoreFor, setRestoreFor] = useState<Plan | null>(null);
  const unarchivePlan = useUnarchivePlan();

  async function confirmRestore() {
    if (!restoreFor) return;
    try {
      await unarchivePlan.mutateAsync(restoreFor.id);
      setRestoreFor(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  async function confirmArchive() {
    if (!archiveFor) return;
    try {
      await archivePlan.mutateAsync(archiveFor.id);
      setArchiveFor(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const renderActions = (plan: Plan) =>
    plan.isArchived ? (
      <RowActions label={`Actions pour le plan ${plan.name}`}>
        <DropdownMenuItem onSelect={() => setEditFor(plan)}>
          <Pencil /> Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setRestoreFor(plan)}>
          <ArchiveRestore /> Désarchiver
        </DropdownMenuItem>
      </RowActions>
    ) : (
      <RowActions label={`Actions pour le plan ${plan.name}`}>
        <DropdownMenuItem onSelect={() => setEditFor(plan)}>
          <Pencil /> Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPriceFor(plan)}>
          <CirclePlus /> Nouveau prix
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => setArchiveFor(plan)}>
          <Archive /> Archiver
        </DropdownMenuItem>
      </RowActions>
    );

  const columns: DataTableColumn<Plan>[] = [
    {
      id: "name",
      header: "Plan",
      accessor: (plan) => plan.name,
      exportValue: (plan) => plan.name,
      cell: (plan) => (
        <>
          <div className="font-medium">{plan.name}</div>
          {plan.description && <div className="text-xs text-muted-foreground">{plan.description}</div>}
        </>
      ),
      mobile: "primary",
    },
    {
      id: "description",
      header: "Description",
      accessor: (plan) => plan.description ?? null,
      cell: (plan) => plan.description ?? "—",
      defaultHidden: true,
      mobile: "hidden",
    },
    {
      id: "prices",
      header: "Prix actifs",
      accessor: pricesText,
      cell: (plan) => <PricesSummary plan={plan} />,
    },
    {
      id: "quotas",
      header: "Quotas",
      accessor: quotasText,
      cell: (plan) => <QuotasSummary plan={plan} />,
      sortable: false,
    },
    {
      id: "features",
      header: "Fonctionnalités",
      accessor: featuresText,
      cell: (plan) => <FeaturesSummary plan={plan} />,
      sortable: false,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (plan) => `${plan.isArchived ? "Archivé" : "Actif"} · ${plan.isPublic ? "Public" : "Sur mesure"}`,
      cell: (plan) => <PlanBadges plan={plan} />,
    },
  ];

  return (
    <>
      <DataTable
        data={plans}
        columns={columns}
        getRowId={(plan) => plan.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les plans tarifaires."
        title="plans"
        searchPlaceholder="Rechercher un plan…"
        stateKey="plans"
        toolbarActions={toolbarActions}
        breakpoint="lg"
        rowActions={renderActions}
        emptyState={
          <EmptyState
            icon={Banknote}
            message="Aucun plan tarifaire pour le moment. Créez un premier plan, puis ajoutez-lui un prix."
            action={
              <Button asChild size="sm">
                <Link href="/plans/new">Nouveau plan</Link>
              </Button>
            }
          />
        }
      />

      <AddPlanPriceDialog plan={priceFor} onOpenChange={(open) => !open && setPriceFor(null)} />
      <EditPlanDialog plan={editFor} onOpenChange={(open) => !open && setEditFor(null)} />
      <ConfirmDialog
        open={restoreFor !== null}
        onOpenChange={(open) => !open && setRestoreFor(null)}
        title={`Désarchiver ${restoreFor?.name ?? "ce plan"} ?`}
        description="Le plan redevient souscriptible par les entreprises (s’il est public et a un prix actif)."
        confirmLabel="Désarchiver le plan"
        destructive={false}
        onConfirm={() => void confirmRestore()}
        isPending={unarchivePlan.isPending}
      />
      <ConfirmDialog
        open={archiveFor !== null}
        onOpenChange={(open) => !open && setArchiveFor(null)}
        title={`Archiver ${archiveFor?.name ?? "ce plan"} ?`}
        description="Le plan ne pourra plus être souscrit par de nouvelles entreprises. Les abonnements en cours sur ce plan ne sont pas affectés."
        confirmLabel="Archiver le plan"
        onConfirm={() => void confirmArchive()}
        isPending={archivePlan.isPending}
      />
    </>
  );
}
