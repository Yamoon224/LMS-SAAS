"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { Toaster, toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api-client";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Message du toast de succès (défaut générique). */
      successMessage?: string;
      /** Aucune notification automatique (réordonnancement, estimation, téléchargement…). */
      silent?: boolean;
    };
  }
}

/** Fournit le QueryClient TanStack Query + les toasts automatiques de mutation (succès / échec). */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            if (mutation.meta?.silent) return;
            toast.success(mutation.meta?.successMessage ?? "Modification enregistrée.");
          },
          onError: (error, _variables, _context, mutation) => {
            // 401 : redirection déjà gérée par api-client.
            if (mutation.meta?.silent || (error instanceof ApiError && error.status === 401)) return;
            toast.error(error, "L’action a échoué.");
          },
        }),
        defaultOptions: {
          queries: {
            // Pas de retry sur 401 (redirection déjà gérée par api-client) ni 404.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
