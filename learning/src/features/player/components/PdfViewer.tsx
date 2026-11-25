"use client";

import { Download } from "lucide-react";

import { pdfViewerSrc } from "../lib/pdf-viewer";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/i18n/client";

interface PdfViewerProps {
  url: string;
  title: string;
  downloadAllowed: boolean;
  /** Ouverture du document (suivi de consultation, RG-08a) : appelée au chargement du cadre. */
  onOpened: () => void;
}

/**
 * Visionneuse PDF intégrée : un cadre sur l'URL signée (aucune dépendance). Le repli « Télécharger » n'existe que
 * si `downloadAllowed` ; sinon aucun lien vers le fichier n'est affiché.
 */
export function PdfViewer({ url, title, downloadAllowed, onOpened }: PdfViewerProps) {
  const copy = useCopy();
  return (
    <div className="flex flex-col gap-3">
      <iframe
        src={pdfViewerSrc(url, downloadAllowed)}
        title={copy.vitrine.pdf.viewerTitle(title)}
        onLoad={onOpened}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-[70dvh] min-h-[420px] w-full rounded-md border border-line bg-card shadow-card"
      />
      <div className="flex flex-col gap-2 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>{downloadAllowed ? copy.vitrine.pdf.fallback : copy.vitrine.pdf.viewOnly}</p>
        {downloadAllowed && (
          <Button asChild variant="outline" size="sm">
            <a href={url} download onClick={onOpened}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.vitrine.pdf.download}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
