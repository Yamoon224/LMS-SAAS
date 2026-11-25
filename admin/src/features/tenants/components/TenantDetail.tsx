"use client";

import { Archive, ArrowLeft, Ban, Info, Play, RotateCcw } from "lucide-react";
import Link from "next/link";

import { TenantActionDialogsHost } from "./TenantActionDialogsHost";
import { TenantDetailTabs } from "./TenantDetailTabs";
import { TenantOnboardingSteps } from "./TenantOnboardingSteps";
import { TenantStatusBadge } from "./TenantStatusBadge";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";
import { useTenant } from "@/features/tenants/hooks/useTenant";
import { useTenantOverview } from "@/features/tenants/hooks/useTenantOverview";
import { ApiError } from "@/lib/api-client";
import { tenantHost } from "@/lib/domain";

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant(tenantId);
  const overviewQuery = useTenantOverview(tenantId);
  const { can } = usePermissions();

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Chargement">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !tenant) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-4">
        <Link href="/tenants" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour aux entreprises
        </Link>
        <ErrorBanner
          title={isNotFound ? "Entreprise introuvable." : "Impossible de charger cette entreprise."}
          error={isNotFound ? undefined : error}
          onRetry={isNotFound ? undefined : () => void refetch()}
        />
      </div>
    );
  }

  const canActivate = (tenant.status === "DRAFT" || tenant.status === "SUSPENDED") && can("tenants.activate");
  const canSuspend = tenant.status === "ACTIVE" && can("tenants.suspend");
  const canArchive = (tenant.status === "ACTIVE" || tenant.status === "SUSPENDED") && can("tenants.suspend");

  return (
    <TenantActionDialogsHost>
      {(setAction) => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href="/tenants"
                className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Retour aux entreprises
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words text-2xl font-semibold tracking-tight">{tenant.name}</h1>
                <TenantStatusBadge status={tenant.status} />
              </div>
              <p className="mt-1 break-all text-sm text-muted-foreground">{tenantHost(tenant.slug)}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {canActivate && (
                <Button onClick={() => setAction({ kind: "activate", tenant })}>
                  {tenant.status === "SUSPENDED" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {tenant.status === "SUSPENDED" ? "Réactiver l’entreprise" : "Activer l’entreprise"}
                </Button>
              )}
              {canSuspend && (
                <Button variant="destructive" onClick={() => setAction({ kind: "suspend", tenant })}>
                  <Ban className="h-4 w-4" />
                  Suspendre l’entreprise
                </Button>
              )}
              {canArchive && (
                <Button variant="outline" onClick={() => setAction({ kind: "archive", tenant })}>
                  <Archive className="h-4 w-4" />
                  Archiver
                </Button>
              )}
            </div>
          </div>

          {tenant.status === "DRAFT" && (
            <div role="status" className="flex items-start gap-3 rounded-md border border-info/30 bg-info/5 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <p>
                <span className="font-medium">Entreprise en brouillon.</span> Elle n’est pas joignable tant qu’elle n’est pas
                activée : son back-office et son espace apprenant ne se résolvent pas. Activez-la pour ouvrir ses accès.
              </p>
            </div>
          )}

          {tenant.status === "SUSPENDED" && (
            <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="font-medium text-danger">Entreprise suspendue : ses accès sont fermés.</p>
                <p className="mt-1">
                  Motif : {tenant.statusReason ? tenant.statusReason : "non renseigné"}.
                </p>
              </div>
            </div>
          )}

          {tenant.status === "ARCHIVED" && (
            <div role="status" className="flex items-start gap-3 rounded-md border border-border bg-surface-muted p-4 text-sm">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p>
                <span className="font-medium">Entreprise archivée.</span> Elle est fermée définitivement ; ses données sont
                conservées en lecture seule.
              </p>
            </div>
          )}

          <TenantOnboardingSteps tenant={tenant} />

          <TenantDetailTabs tenantId={tenant.id} overviewQuery={overviewQuery} />
        </div>
      )}
    </TenantActionDialogsHost>
  );
}
