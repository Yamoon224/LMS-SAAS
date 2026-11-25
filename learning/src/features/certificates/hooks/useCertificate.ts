"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCertificate } from "../api/certificates.api";

export function useCertificate(enrollmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["certificate", enrollmentId],
    queryFn: () => fetchCertificate(enrollmentId),
    enabled,
  });
}
