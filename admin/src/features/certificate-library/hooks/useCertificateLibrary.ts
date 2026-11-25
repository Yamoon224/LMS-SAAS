import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLibraryTemplate,
  deleteLibraryTemplate,
  fetchLibraryTemplates,
  setLibraryTemplatePublished,
  updateLibraryTemplate,
} from "../api/certificate-library.api";
import type { LibraryFormValues } from "../schemas/certificate-library.schema";

const LIBRARY_KEY = ["certificate-library"] as const;

export function useLibraryTemplates() {
  return useQuery({ queryKey: LIBRARY_KEY, queryFn: fetchLibraryTemplates });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: LIBRARY_KEY });
}

export function useSaveLibraryTemplate() {
  const invalidate = useInvalidate();
  return useMutation({
    meta: { successMessage: "Modèle enregistré." },
    mutationFn: ({ id, values }: { id?: string; values: LibraryFormValues }) =>
      id ? updateLibraryTemplate(id, values) : createLibraryTemplate(values),
    onSuccess: invalidate,
  });
}

export function useSetLibraryPublished() {
  const invalidate = useInvalidate();
  return useMutation({
    meta: { successMessage: "Publication mise à jour." },
    mutationFn: ({ id, published }: { id: string; published: boolean }) => setLibraryTemplatePublished(id, published),
    onSuccess: invalidate,
  });
}

export function useDeleteLibraryTemplate() {
  const invalidate = useInvalidate();
  return useMutation({
    meta: { successMessage: "Modèle supprimé." },
    mutationFn: deleteLibraryTemplate,
    onSuccess: invalidate,
  });
}
