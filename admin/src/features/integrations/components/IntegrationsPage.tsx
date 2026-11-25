"use client";

import { useState } from "react";

import { useIntegrations, useResetIntegration } from "../hooks/useIntegrations";
import { SOURCE_LABELS } from "../schemas/integration.schema";
import type { Integration } from "../schemas/integration.schema";

import { IntegrationDialog } from "./IntegrationDialog";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const SOURCE_VARIANT = { PLATFORM: "success", ENVIRONMENT: "secondary", NONE: "warning" } as const;

function IntegrationCard({
  integration,
  onEdit,
  onReset,
}: {
  integration: Integration;
  onEdit: (integration: Integration) => void;
  onReset: (integration: Integration) => void;
}) {
  const missing = integration.fields.filter((field) => field.required && !field.configured);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{integration.label}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
        </div>
        <Badge variant={SOURCE_VARIANT[integration.source]}>{SOURCE_LABELS[integration.source]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {missing.length > 0 && (
          <p className="text-sm text-warning">À renseigner : {missing.map((field) => field.label).join(", ")}.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onEdit(integration)}>
            Configurer
          </Button>
          {integration.source === "PLATFORM" && (
            <Button size="sm" variant="outline" onClick={() => onReset(integration)}>
              Revenir à l&apos;environnement
            </Button>
          )}
        </div>
        {integration.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Modifiée le {integration.updatedAt.toLocaleString("fr-FR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** ADM-37 : fournisseurs externes de la plateforme (IA, e-mail, SMS, Google), secrets chiffrés. */
export function IntegrationsPage() {
  const { data, isLoading, isError, error } = useIntegrations();
  const reset = useResetIntegration();
  const [editing, setEditing] = useState<Integration | null>(null);
  const [resetting, setResetting] = useState<Integration | null>(null);

  async function confirmReset() {
    if (!resetting) return;
    try {
      await reset.mutateAsync(resetting.provider);
      setResetting(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger les intégrations." error={error} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((integration) => (
          <IntegrationCard key={integration.provider} integration={integration} onEdit={setEditing} onReset={setResetting} />
        ))}
      </div>
      <IntegrationDialog integration={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title="Revenir à l'environnement"
        description={`La configuration saisie pour « ${resetting?.label ?? ""} », secrets compris, sera supprimée. La plateforme utilisera de nouveau les variables d'environnement du serveur.`}
        confirmLabel="Supprimer la configuration"
        isPending={reset.isPending}
        onConfirm={() => void confirmReset()}
      />
    </div>
  );
}
