"use client";

import { Plus, Undo2 } from "lucide-react";
import { useState } from "react";

import { PaymentProviderList } from "./PaymentProviderList";
import { RefundPaymentDialog } from "./RefundPaymentDialog";

import { AccessDenied } from "@/components/feedback/AccessDenied";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";

/** Page Paiements : fournisseurs (payments.manage-providers) et remboursement (payments.refund). */
export function PaymentsPage() {
  const { can, isLoading } = usePermissions();
  const [refundOpen, setRefundOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const canManage = can("payments.manage-providers");
  const canRefund = can("payments.refund");
  if (!canManage && !canRefund) return <AccessDenied />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {canRefund && (
          <Button variant="outline" onClick={() => setRefundOpen(true)}>
            <Undo2 className="h-4 w-4" />
            Traiter un remboursement
          </Button>
        )}
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Configurer un fournisseur
          </Button>
        )}
      </div>

      {canManage ? (
        <PaymentProviderList createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          La gestion des fournisseurs de paiement n’est pas disponible avec votre rôle.
        </p>
      )}

      {canRefund && <RefundPaymentDialog open={refundOpen} onOpenChange={setRefundOpen} />}
    </div>
  );
}
