"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPaymentMethods } from "../api/payments.api";

export function usePaymentMethods(enabled = true) {
  return useQuery({ queryKey: ["payment-methods"], queryFn: fetchPaymentMethods, enabled, staleTime: 60_000 });
}
