"use client";

import { Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CERTIFICATE_STATUS_LABELS } from "@/features/supervision/schemas/supervision.schema";
import type { SupervisedCertificate } from "@/features/supervision/schemas/supervision.schema";
import { formatDate } from "@/lib/format";

/** GET /admin/certificates/:number/preview : PDF recomposé depuis les données figées du certificat et le design de son modèle. */
async function fetchCertificatePdf(number: string): Promise<Blob> {
  const response = await fetch(`/api/backend/admin/certificates/${encodeURIComponent(number)}/preview`, { cache: "no-store" });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(message ?? "Aperçu impossible.");
  }
  return response.blob();
}

interface CertificatePreviewDialogProps {
  /** Certificat à prévisualiser ; `null` = fermé. */
  certificate: SupervisedCertificate | null;
  onOpenChange: (open: boolean) => void;
}

/** ADM-31 : aperçu du certificat tel qu'il a été délivré (nom, formation, numéro, score et date figés), avec ouverture et téléchargement. */
export function CertificatePreviewDialog({ certificate, onOpenChange }: CertificatePreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const number = certificate?.number ?? null;

  useEffect(() => {
    if (!number) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    fetchCertificatePdf(number)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Aperçu impossible.");
      });
    return () => {
      cancelled = true;
      // Libère le PDF en mémoire à la fermeture ou au changement de certificat.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [number]);

  return (
    <Dialog open={certificate !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Certificat {certificate?.number}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {certificate && (
              <>
                <span>
                  {certificate.learnerName} · {certificate.courseTitle}
                </span>
                <span>{certificate.tenantName}</span>
                <span>Délivré le {formatDate(certificate.issuedAt)}</span>
                <Badge variant={certificate.status === "VALID" ? "success" : certificate.status === "REVOKED" ? "danger" : "secondary"}>
                  {CERTIFICATE_STATUS_LABELS[certificate.status]}
                </Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        ) : url ? (
          <iframe title={`Aperçu du certificat ${number}`} src={url} className="h-[60vh] w-full rounded-md border border-border bg-surface-muted" />
        ) : (
          <Skeleton className="h-[60vh] w-full" role="status" aria-label="Chargement de l’aperçu" />
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Aperçu recomposé à partir des informations figées à la délivrance et du modèle de l’entreprise ; il ne modifie pas le certificat.
        </p>

        {url && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ouvrir dans un onglet
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={url} download={`certificat-${number}.pdf`}>
                <Download className="h-4 w-4" aria-hidden="true" /> Télécharger
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
