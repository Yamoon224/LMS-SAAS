import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCertificateTemplate,
  fetchCertificateDownloadUrl,
  fetchCertificates,
  fetchCertificateTemplates,
  fetchLibraryTemplates,
  installLibraryTemplate,
  reissueCertificate,
  revokeCertificate,
} from "../api/certificates.api";
import type { CreateTemplateValues } from "../schemas/certificate.schema";

export const certificatesQueryKey = ["certificates"] as const;
export const certificateTemplatesQueryKey = ["certificate-templates"] as const;

/** Certificats émis par l'entreprise (ENT-42/ENT-43). */
export function useCertificates() {
  return useQuery({ queryKey: certificatesQueryKey, queryFn: fetchCertificates });
}

/** Modèles de certificat (ENT-38). */
export function useCertificateTemplates() {
  return useQuery({ queryKey: certificateTemplatesQueryKey, queryFn: fetchCertificateTemplates });
}

/** Révocation (ENT-44) et réémission (ENT-44) + invalidation de la liste; téléchargement = URL signée à la demande. */
export function useCertificateActions() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: certificatesQueryKey });

  const revoke = useMutation({
    meta: { successMessage: "Certificat révoqué.", inlineError: true },
    mutationFn: ({ certificateId, reason }: { certificateId: string; reason: string }) =>
      revokeCertificate(certificateId, reason),
    onSuccess: invalidate,
  });

  const reissue = useMutation({
    meta: { successMessage: "Certificat réémis." },
    mutationFn: (certificateId: string) => reissueCertificate(certificateId),
    onSuccess: invalidate,
  });

  const download = useMutation({
    meta: { silent: true },
    mutationFn: (certificateId: string) => fetchCertificateDownloadUrl(certificateId),
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });

  return { revoke, reissue, download };
}

export function useCreateCertificateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Modèle de certificat créé.", inlineError: true },
    mutationFn: (values: CreateTemplateValues) => createCertificateTemplate(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: certificateTemplatesQueryKey });
    },
  });
}

export const libraryTemplatesQueryKey = ["certificate-library"] as const;

/** Modèles publiés de la bibliothèque de la plateforme (ADM-39). */
export function useLibraryTemplates() {
  return useQuery({ queryKey: libraryTemplatesQueryKey, queryFn: fetchLibraryTemplates });
}

/** Installe une copie du modèle ; la liste des modèles de l'entreprise est relue. */
export function useInstallLibraryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Modèle ajouté à vos modèles." },
    mutationFn: ({ id, makeDefault }: { id: string; makeDefault: boolean }) => installLibraryTemplate(id, makeDefault),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: certificateTemplatesQueryKey }),
  });
}

