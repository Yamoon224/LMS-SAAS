"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchEnabledLanguages, fetchProfile, updateProfile } from "../api/profile.api";

const PROFILE_KEY = ["my-profile"] as const;

export function useProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: fetchProfile });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

/** Langues activées sur la plateforme ; en cas d'échec le formulaire retombe sur la liste statique. */
export function useEnabledLanguages() {
  return useQuery({ queryKey: ["enabled-languages"], queryFn: fetchEnabledLanguages, retry: false });
}
