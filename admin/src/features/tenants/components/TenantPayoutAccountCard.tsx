"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useTenantPayoutAccount, useVerifyTenantPayoutAccount } from "../hooks/useTenantPayoutAccount";
import { MOBILE_OPERATOR_LABELS, PAYOUT_TYPE_LABELS } from "../schemas/payout-account.schema";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";

/** ENT-11 : consulter (numéro masqué) et vérifier le compte de reversement d'une entreprise. */
export function TenantPayoutAccountCard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError, error, refetch } = useTenantPayoutAccount(tenantId);
  const verify = useVerifyTenantPayoutAccount(tenantId);
  const { can } = usePermissions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
          Compte de reversement
        </CardTitle>
        <CardDescription>
          Tant que ce compte n’est pas vérifié, aucun reversement ne peut être demandé par l’entreprise. Toute
          modification par l’entreprise remet la vérification à zéro.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {isError && <ErrorBanner title="Impossible de charger le compte de reversement." error={error} onRetry={() => void refetch()} />}
        {data && !data.account && <p className="text-sm text-muted-foreground">Aucun compte de reversement renseigné.</p>}
        {data?.account && (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Type" value={PAYOUT_TYPE_LABELS[data.account.type]} />
              <Field
                label="Opérateur"
                value={data.account.operator ? (MOBILE_OPERATOR_LABELS[data.account.operator] ?? data.account.operator) : "—"}
              />
              <Field label="Titulaire" value={data.account.accountName} />
              <Field label="Numéro (masqué)" value={data.account.maskedNumber} mono />
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={data.verified ? "success" : "warning"}>{data.verified ? "Vérifié" : "Non vérifié"}</Badge>
              {!data.verified && can("payout-accounts.verify") && (
                <Button onClick={() => setConfirmOpen(true)}>Marquer comme vérifié</Button>
              )}
            </div>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Vérifier le compte de reversement"
              description={`Confirmez-vous avoir contrôlé le compte ${data.account.maskedNumber} au nom de « ${data.account.accountName} » ? Les reversements de cette entreprise seront alors autorisés.`}
              confirmLabel="Marquer comme vérifié"
              destructive={false}
              isPending={verify.isPending}
              onConfirm={() => verify.mutate(undefined, { onSettled: () => setConfirmOpen(false) })}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-sm" : "break-words text-sm font-medium"}>{value}</dd>
    </div>
  );
}
