"use client";

import { useState } from "react";

import { useManageEnrollment } from "../hooks/useManageEnrollment";
import { ALLOWED_ENROLLMENT_STATUS_TRANSITIONS, canRejectOfflinePayment } from "../schemas/enrollment.schema";
import type { EnrollmentDetail, EnrollmentStatus } from "../schemas/enrollment.schema";

import { ExtendAccessDialog } from "./ExtendAccessDialog";
import { RejectOfflinePaymentDialog } from "./RejectOfflinePaymentDialog";
import { ValidateOfflinePaymentDialog } from "./ValidateOfflinePaymentDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GrantAttemptsDialog } from "@/features/assessments/components/GrantAttemptsDialog";
import { useSession } from "@/features/session/hooks/useSession";

const PAYMENT_PENDING_STATUSES: EnrollmentStatus[] = ["PENDING_PAYMENT", "PENDING_VALIDATION"];
const ACCESS_MANAGEABLE_STATUSES: EnrollmentStatus[] = ["ACTIVE", "SUSPENDED"];

function actionFlags(status: EnrollmentStatus, can: (permission?: string) => boolean) {
  const mayManage = can("learners.manage");
  return {
    canValidatePayment: PAYMENT_PENDING_STATUSES.includes(status) && can("offline-payments.validate"),
    canRejectPayment: canRejectOfflinePayment(status) && can("offline-payments.validate"),
    canManageAccess: mayManage && ACCESS_MANAGEABLE_STATUSES.includes(status),
    canReactivate: mayManage && status === "SUSPENDED",
    canSuspend: mayManage && ALLOWED_ENROLLMENT_STATUS_TRANSITIONS[status].includes("SUSPENDED"),
    mayGrant: can("courses.manage"),
  };
}

/**
 * Actions de gestion d'une inscription (ENT-61/ENT-64), extraites de EnrollmentDetail pour
 * garder la complexité de chaque composant raisonnable. N'affiche que les actions valides
 * depuis le statut courant (ALLOWED_ENROLLMENT_STATUS_TRANSITIONS, miroir du backend).
 */
export function EnrollmentActions({
  courseId,
  enrollment,
}: {
  courseId: string;
  enrollment: EnrollmentDetail;
}) {
  const { validatePayment, rejectPayment, suspend, reactivate, extendAccess, resetProgress } = useManageEnrollment(
    enrollment.id,
    courseId,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const { can } = useSession();
  const mayManage = can("learners.manage");

  const allowedTargets = ALLOWED_ENROLLMENT_STATUS_TRANSITIONS[enrollment.status];
  const isBusy = [validatePayment, rejectPayment, suspend, reactivate, extendAccess, resetProgress].some((m) => m.isPending);

  /** Les erreurs sont notifiées par toast (MutationCache) : ici on avale seulement le rejet. */
  async function runAction(action: () => Promise<unknown>) {
    try {
      await action();
    } catch {
      // déjà notifié
    }
  }

  const { canValidatePayment, canRejectPayment, canManageAccess, canReactivate, canSuspend, mayGrant } = actionFlags(
    enrollment.status,
    can,
  );
  const isTerminal = allowedTargets.length === 0 && enrollment.status !== "SUSPENDED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canValidatePayment && (
            <ValidateOfflinePaymentDialog
              isPending={validatePayment.isPending}
              onValidate={(values) => runAction(() => validatePayment.mutateAsync(values))}
            />
          )}

          {canRejectPayment && (
            <RejectOfflinePaymentDialog
              isPending={rejectPayment.isPending}
              onReject={(values) => runAction(() => rejectPayment.mutateAsync(values))}
            />
          )}

          {canSuspend && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => runAction(() => suspend.mutateAsync())}
            >
              Suspendre
            </Button>
          )}

          {canReactivate && (
            <Button size="sm" disabled={isBusy} onClick={() => runAction(() => reactivate.mutateAsync())}>
              Réactiver
            </Button>
          )}

          {canManageAccess && (
            <ExtendAccessDialog
              isPending={extendAccess.isPending}
              onExtend={(values) => runAction(() => extendAccess.mutateAsync(values))}
            />
          )}

          {mayGrant && <GrantAttemptsDialog courseId={courseId} enrollmentId={enrollment.id} />}

          {canManageAccess && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isBusy}
              onClick={() => setConfirmReset(true)}
            >
              Réinitialiser la progression
            </Button>
          )}
        </div>

        {!mayManage && !canValidatePayment && !canRejectPayment && !mayGrant && (
          <p className="text-xs text-muted-foreground">Consultation seule : votre rôle ne permet pas de gérer cette inscription.</p>
        )}

        {isTerminal && mayManage && (
          <p className="text-xs text-muted-foreground">
            Statut terminal — aucune action de transition disponible.
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Réinitialiser la progression ?"
        description="Toute la progression de cet apprenant sur la formation sera effacée. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        isPending={resetProgress.isPending}
        onConfirm={() => void runAction(() => resetProgress.mutateAsync()).then(() => setConfirmReset(false))}
      />
    </Card>
  );
}
