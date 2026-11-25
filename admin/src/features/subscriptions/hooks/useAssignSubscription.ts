import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignSubscription } from "../api/subscriptions.api";
import type { AssignSubscriptionValues } from "../schemas/subscription.schema";

/** ADM-09: attribution d'un plan à une entreprise. */
export function useAssignSubscription(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Plan attribué à l'entreprise." },
    mutationFn: (values: AssignSubscriptionValues) => assignSubscription(tenantId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantId, "subscription"] });
    },
  });
}
