"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { acceptLegal, fetchPendingLegal } from "../api/legal-acceptance.api";
import type { PendingLegal } from "../schemas/pending-legal.schema";

const PENDING_KEY = ["pending-legal"] as const;

/** Documents à accepter ; désactivé pour un visiteur non connecté. Une erreur (ex. compte non apprenant) n'est pas réessayée. */
export function usePendingLegal(enabled: boolean) {
  return useQuery({ queryKey: PENDING_KEY, queryFn: fetchPendingLegal, enabled, retry: false });
}

export function useAcceptLegal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documents: PendingLegal[]) => {
      for (const document of documents) await acceptLegal(document);
    },
    // Dans tous les cas on relit la liste : si une version a changé, le nouveau texte est présenté.
    onSettled: () => queryClient.invalidateQueries({ queryKey: PENDING_KEY }),
  });
}
