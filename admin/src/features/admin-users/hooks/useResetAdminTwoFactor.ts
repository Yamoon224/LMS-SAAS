import { useMutation } from "@tanstack/react-query";

import { resetAdminTwoFactor } from "../api/admin-users.api";

/** Réinitialisation de la 2FA d'un autre administrateur (ADM-36) : sessions révoquées, ré-enrôlement exigé. */
export function useResetAdminTwoFactor() {
  return useMutation({
    meta: { successMessage: "Double authentification réinitialisée." },
    mutationFn: resetAdminTwoFactor,
  });
}
