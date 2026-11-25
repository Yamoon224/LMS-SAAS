import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDesignPreview } from "../api/certificate-library.api";
import type { LibraryDesign } from "../schemas/certificate-library.schema";

/**
 * Aperçu PDF d'un design, affiché dans un cadre intégré. L'URL du Blob est libérée au remplacement et au démontage
 * (sinon chaque aperçu garderait un PDF en mémoire). Une réponse tardive d'un aperçu déjà remplacé est ignorée.
 */
export function usePdfPreview() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  const current = useRef<string | null>(null);

  const release = useCallback(() => {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = null;
  }, []);

  const load = useCallback(
    async (design: LibraryDesign) => {
      const request = ++latest.current;
      setLoading(true);
      setError(null);
      try {
        const blob = await fetchDesignPreview(design);
        if (request !== latest.current) return;
        release();
        current.current = URL.createObjectURL(blob);
        setUrl(current.current);
      } catch (cause) {
        if (request === latest.current) setError(cause instanceof Error ? cause.message : "Aperçu impossible.");
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [release],
  );

  const reset = useCallback(() => {
    latest.current += 1;
    release();
    setUrl(null);
    setError(null);
    setLoading(false);
  }, [release]);

  useEffect(() => release, [release]);

  return { url, error, loading, load, reset };
}
