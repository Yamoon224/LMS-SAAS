"use client";

import { ArrowRight, BellRing, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { ALERT_SEVERITY_LABELS, ALERT_SEVERITY_VARIANTS, countBySeverity, safeAlertHref } from "../schemas/alerts.schema";
import type { AdminAlert } from "../schemas/alerts.schema";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAlerts } from "@/features/analytics/hooks/useAdminAlerts";

/** ADM-03 : alertes actives de la plateforme, du plus grave au moins grave, chacune avec son lien d'action. */
export function AdminAlertsWidget() {
  const { data, isLoading, isError, error, refetch } = useAdminAlerts();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-brand" aria-hidden="true" />
          Alertes
        </CardTitle>
        {data && data.alerts.length > 0 && <AlertsSummary alerts={data.alerts} />}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2" role="status" aria-label="Chargement des alertes">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {isError && <ErrorBanner title="Impossible de charger les alertes." error={error} onRetry={() => void refetch()} />}
        {data && data.alerts.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            Aucune alerte : tout est sous contrôle.
          </p>
        )}
        {data && data.alerts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {data.alerts.map((alert) => (
              <AlertRow key={alert.type} alert={alert} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsSummary({ alerts }: { alerts: readonly AdminAlert[] }) {
  const counts = countBySeverity(alerts);
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Répartition des alertes par sévérité">
      {(["CRITICAL", "WARNING", "INFO"] as const)
        .filter((severity) => counts[severity] > 0)
        .map((severity) => (
          <Badge key={severity} variant={ALERT_SEVERITY_VARIANTS[severity]}>
            {counts[severity]} {ALERT_SEVERITY_LABELS[severity].toLowerCase()}
          </Badge>
        ))}
    </div>
  );
}

function AlertRow({ alert }: { alert: AdminAlert }) {
  return (
    <li>
      <Link
        href={safeAlertHref(alert.href)}
        className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Badge variant={ALERT_SEVERITY_VARIANTS[alert.severity]} className="mt-0.5 shrink-0">
          {ALERT_SEVERITY_LABELS[alert.severity]}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {alert.title} <span className="tabular-nums text-muted-foreground">({alert.count})</span>
          </p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{alert.detail}</p>
        </div>
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
