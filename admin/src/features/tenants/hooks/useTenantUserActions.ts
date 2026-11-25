import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  reactivateTenantUser,
  resendTenantUserInvitation,
  resetTenantUserTwoFactor,
  sendTenantUserPasswordReset,
  suspendTenantUser,
  transferTenantOwnership,
} from "../api/tenant-users.api";
import type { TenantUserActionKind } from "../schemas/tenant-user-actions";

const ACTIONS: Record<TenantUserActionKind, { run: (tenantId: string, userId: string) => Promise<unknown>; message: string }> = {
  suspend: { run: suspendTenantUser, message: "Compte suspendu." },
  reactivate: { run: reactivateTenantUser, message: "Compte réactivé." },
  resendInvitation: { run: resendTenantUserInvitation, message: "Invitation renvoyée par e-mail." },
  passwordReset: { run: sendTenantUserPasswordReset, message: "Lien de réinitialisation envoyé par e-mail." },
  reset2fa: { run: resetTenantUserTwoFactor, message: "Double authentification réinitialisée ; sessions révoquées." },
  transferOwnership: { run: transferTenantOwnership, message: "Propriété de l'entreprise transférée." },
};

/** ADM-06 : une mutation par type d'action (message de succès propre), qui rafraîchit onglet Utilisateurs, aperçu et audit. */
export function useTenantUserAction(tenantId: string, kind: TenantUserActionKind) {
  const queryClient = useQueryClient();
  const action = ACTIONS[kind];

  return useMutation({
    meta: { successMessage: action.message },
    mutationFn: (userId: string) => action.run(tenantId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}

/** Les six mutations en un appel (ordre fixe : respect des règles des hooks), indexées par type d'action. */
export function useTenantUserActions(tenantId: string) {
  const suspend = useTenantUserAction(tenantId, "suspend");
  const reactivate = useTenantUserAction(tenantId, "reactivate");
  const resendInvitation = useTenantUserAction(tenantId, "resendInvitation");
  const passwordReset = useTenantUserAction(tenantId, "passwordReset");
  const reset2fa = useTenantUserAction(tenantId, "reset2fa");
  const transferOwnership = useTenantUserAction(tenantId, "transferOwnership");
  return { suspend, reactivate, resendInvitation, passwordReset, reset2fa, transferOwnership };
}
