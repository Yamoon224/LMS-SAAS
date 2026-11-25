import { useQuery } from "@tanstack/react-query";

import { fetchCertificates, fetchCourses, fetchLearners, fetchTransactions } from "../api/supervision.api";

export function useSupervisedCourses(tenantId?: string) {
  return useQuery({ queryKey: ["supervision", "courses", tenantId ?? "all"], queryFn: () => fetchCourses(tenantId) });
}

export function useSupervisedLearners(tenantId?: string) {
  return useQuery({ queryKey: ["supervision", "learners", tenantId ?? "all"], queryFn: () => fetchLearners(tenantId) });
}

export function useSupervisedCertificates(tenantId?: string) {
  return useQuery({
    queryKey: ["supervision", "certificates", tenantId ?? "all"],
    queryFn: () => fetchCertificates(tenantId),
  });
}

export function useSupervisedTransactions(tenantId?: string) {
  return useQuery({
    queryKey: ["supervision", "transactions", tenantId ?? "all"],
    queryFn: () => fetchTransactions(tenantId),
  });
}
