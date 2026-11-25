"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchMyRefunds, requestRefund } from "../api/refunds.api";

const MY_REFUNDS_KEY = ["my-refunds"] as const;

/** Demandes de remboursement de l'apprenant connecté. */
export function useMyRefunds() {
  return useQuery({ queryKey: MY_REFUNDS_KEY, queryFn: fetchMyRefunds });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestRefund,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_REFUNDS_KEY }),
  });
}
