"use client";

import { PayoutsPanel } from "./PayoutsPanel";
import { TenantBalanceLookup } from "./TenantBalanceLookup";

import { AccessDenied } from "@/components/feedback/AccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";

/** Finances : solde (wallet.view-all) et file des reversements (payouts.validate pour la lecture). */
export function WalletsPage() {
  const { can, isLoading } = usePermissions();
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const canBalance = can("wallet.view-all");
  const canPayouts = can("payouts.validate");
  if (!canBalance && !canPayouts) return <AccessDenied />;

  return (
    <div className="flex flex-col gap-6">
      {canBalance && <TenantBalanceLookup />}
      {canPayouts ? (
        <PayoutsPanel />
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          La file des reversements n’est pas disponible avec votre rôle.
        </p>
      )}
    </div>
  );
}
