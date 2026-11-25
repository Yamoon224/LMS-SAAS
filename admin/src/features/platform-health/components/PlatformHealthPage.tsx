"use client";

import { RefreshCw } from "lucide-react";

import { usePlatformHealth } from "../hooks/usePlatformHealth";
import type { PlatformHealth } from "../schemas/platform-health.schema";
import { formatBytes } from "../schemas/platform-health.schema";

import { HealthStatusBadge } from "./HealthStatusBadge";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatNumber } from "@/lib/format";

const QUEUE_COUNT_LABELS = [
  ["waiting", "En attente"],
  ["active", "En cours"],
  ["delayed", "Différées"],
  ["failed", "En échec"],
  ["paused", "En pause"],
] as const;

function QueuesCard({ queues }: { queues: PlatformHealth["queues"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Files de tâches</CardTitle>
        <CardDescription>Envoi des e-mails et SMS. Une tâche en échec ou plus de 100 tâches en attente = dégradé.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {queues.map((queue) => (
          <div key={queue.name} className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-medium">
              {queue.name} <HealthStatusBadge status={queue.status} />
            </p>
            {queue.counts ? (
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {QUEUE_COUNT_LABELS.map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{formatNumber(queue.counts?.[key] ?? 0)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p role="alert" className="text-sm text-danger">
                File injoignable (Redis arrêté ou inaccessible) : aucun envoi asynchrone n&apos;est possible tant que le
                problème persiste.
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WebhooksCard({ webhooks }: { webhooks: PlatformHealth["webhooks"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Webhooks de paiement <HealthStatusBadge status={webhooks.status} />
        </CardTitle>
        <CardDescription>
          {webhooks.windowHours} dernières heures : {formatNumber(webhooks.total)} reçus,{" "}
          {formatNumber(webhooks.failed)} en erreur ({webhooks.errorRatePercent.toLocaleString("fr-FR")} %). Erreur =
          signature invalide, référence inconnue ou échec de traitement ; dégradé à partir de 20 % sur au moins 5
          événements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {webhooks.providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun webhook reçu sur la période.</p>
        ) : (
          <ul className="divide-y divide-border">
            {webhooks.providers.map((provider) => (
              <li key={provider.providerCode} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  {provider.providerCode} <HealthStatusBadge status={provider.status} />
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatNumber(provider.total)} reçus · {formatNumber(provider.failed)} en erreur (
                  {provider.errorRatePercent.toLocaleString("fr-FR")} %)
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StorageCard({ storage }: { storage: PlatformHealth["storage"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stockage global</CardTitle>
        <CardDescription>
          {formatBytes(storage.totalBytes)} pour {formatNumber(storage.assetsCount)} fichier(s) téléversé(s) par{" "}
          {formatNumber(storage.tenantsCount)} entreprise(s). Fichiers d&apos;origine seulement : les versions vidéo
          transcodées ne sont pas comptées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {storage.topTenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fichier téléversé.</p>
        ) : (
          <ol className="divide-y divide-border">
            {storage.topTenants.map((tenant) => (
              <li key={tenant.tenantId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium">{tenant.tenantName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBytes(tenant.bytes)} · {formatNumber(tenant.assets)} fichier(s)
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** ADM-35 : santé technique de la plateforme (files de tâches, webhooks, stockage), relue toutes les 30 secondes. */
export function PlatformHealthPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = usePlatformHealth();

  if (isError && isForbidden(error)) return <AccessDenied />;
  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) {
    return <ErrorBanner title="Impossible de charger la santé technique." error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          État global : <HealthStatusBadge status={data.overall} />
          <span className="text-muted-foreground">· relevé le {formatDateTime(data.generatedAt)}</span>
        </p>
        <Button type="button" size="sm" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          <RefreshCw className={isFetching ? "animate-spin" : undefined} aria-hidden="true" />
          Actualiser
        </Button>
      </div>
      <QueuesCard queues={data.queues} />
      <WebhooksCard webhooks={data.webhooks} />
      <StorageCard storage={data.storage} />
    </div>
  );
}
