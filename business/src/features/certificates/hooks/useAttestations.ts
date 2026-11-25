import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchAttestationDownloadUrl, fetchAttestations, revokeAttestation } from "../api/attestations.api";

export const attestationsQueryKey = ["attestations"] as const;

/** Attestations de suivi délivrées par l'entreprise (ENT-44). */
export function useAttestations() {
  return useQuery({ queryKey: attestationsQueryKey, queryFn: fetchAttestations });
}

/** Révocation motivée + téléchargement (URL signée à la demande). */
export function useAttestationActions() {
  const queryClient = useQueryClient();

  const revoke = useMutation({
    meta: { successMessage: "Attestation révoquée.", inlineError: true },
    mutationFn: ({ attestationId, reason }: { attestationId: string; reason: string }) =>
      revokeAttestation(attestationId, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: attestationsQueryKey }),
  });

  const download = useMutation({
    meta: { silent: true },
    mutationFn: (attestationId: string) => fetchAttestationDownloadUrl(attestationId),
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });

  return { revoke, download };
}
