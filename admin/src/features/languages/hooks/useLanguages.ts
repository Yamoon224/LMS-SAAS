import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchLanguages, setLanguageEnabled } from "../api/language.api";

const LANGUAGES_KEY = ["languages"] as const;

export function useLanguages() {
  return useQuery({ queryKey: LANGUAGES_KEY, queryFn: fetchLanguages });
}

export function useSetLanguageEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Langue mise à jour." },
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) => setLanguageEnabled(code, enabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LANGUAGES_KEY }),
  });
}
