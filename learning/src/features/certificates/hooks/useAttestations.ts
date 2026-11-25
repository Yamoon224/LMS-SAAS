"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMyAttestations } from "../api/attestations.api";

export function useMyAttestations() {
  return useQuery({ queryKey: ["attestations", "mine"], queryFn: fetchMyAttestations });
}
