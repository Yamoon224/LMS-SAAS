import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createLegalDraft, fetchLegalDocuments, publishLegalDocument, updateLegalDraft } from "../api/legal.api";
import type { LegalDraftFormValues, LegalType } from "../schemas/legal.schema";

const LEGAL_KEY = ["legal"] as const;

export function useLegalDocuments() {
  return useQuery({ queryKey: LEGAL_KEY, queryFn: fetchLegalDocuments });
}

export function useCreateLegalDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Brouillon créé." },
    mutationFn: ({ type, values }: { type: LegalType; values: LegalDraftFormValues }) => createLegalDraft(type, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEGAL_KEY }),
  });
}

export function useUpdateLegalDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Brouillon enregistré." },
    mutationFn: ({ id, values }: { id: string; values: LegalDraftFormValues }) => updateLegalDraft(id, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEGAL_KEY }),
  });
}

export function usePublishLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Version publiée." },
    mutationFn: publishLegalDocument,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEGAL_KEY }),
  });
}
