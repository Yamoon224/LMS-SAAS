"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPurchases } from "../api/purchases.api";

export function usePurchases() {
  return useQuery({ queryKey: ["my-purchases"], queryFn: fetchPurchases });
}
