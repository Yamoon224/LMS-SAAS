"use client";

import { Award } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { fetchLibraryPreview } from "../api/certificates.api";
import { useInstallLibraryTemplate, useLibraryTemplates } from "../hooks/useCertificates";
import { BORDER_LABELS, FONT_LABELS, ORIENTATION_LABELS } from "../schemas/certificate.schema";
import type { LibraryTemplate } from "../schemas/certificate.schema";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const HEX = /^#[0-9a-fA-F]{6}$/;

function Swatch({ color }: { color: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 rounded border border-border"
      style={{ backgroundColor: color && HEX.test(color) ? color : "transparent" }}
    />
  );
}

/** Aperçu PDF d'un modèle dans un cadre intégré ; l'URL du Blob est libérée à la fermeture. */
function PreviewDialog({ template, onClose }: { template: LibraryTemplate | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    setUrl(null);
    setError(null);
    fetchLibraryPreview(template.id)
      .then((blob) => {
        if (cancelled) return;
        current.current = URL.createObjectURL(blob);
        setUrl(current.current);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Aperçu impossible.");
      });
    return () => {
      cancelled = true;
      if (current.current) URL.revokeObjectURL(current.current);
      current.current = null;
    };
  }, [template]);

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aperçu — {template?.name}</DialogTitle>
          <DialogDescription>Rendu avec des données fictives : aucun apprenant réel n&apos;est utilisé.</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {url ? (
          <iframe title="Aperçu du certificat" src={url} className="h-[28rem] w-full rounded border border-border" />
        ) : (
          !error && (
            <div className="flex h-[28rem] items-center justify-center">
              <Spinner />
            </div>
          )
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Bibliothèque de modèles proposés par la plateforme (ADM-39) : aperçu puis ajout d'une copie à ses modèles. */
export function LibraryTab() {
  const { data, isLoading, isError, error } = useLibraryTemplates();
  const install = useInstallLibraryTemplate();
  const [previewing, setPreviewing] = useState<LibraryTemplate | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);

  if (isLoading) return <Skeleton className="h-48" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger la bibliothèque." error={error} />;
  if (data.length === 0) {
    return <EmptyState icon={Award} message="La plateforme ne propose pas encore de modèle. Créez le vôtre dans l'onglet Modèles." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        « Utiliser ce modèle » ajoute une <strong>copie</strong> à vos modèles : si la plateforme modifie ou retire le
        modèle ensuite, vos certificats ne changent pas.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} />
        Définir comme modèle par défaut de l&apos;entreprise
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Swatch color={template.design.primaryColor} />
                <Swatch color={template.design.textColor} />
                <Swatch color={template.design.secondaryColor} />
              </div>
              <p className="text-sm text-muted-foreground">
                {FONT_LABELS[template.design.fontFamily ?? "HELVETICA"]} ·{" "}
                {ORIENTATION_LABELS[template.design.orientation ?? "LANDSCAPE"]} ·{" "}
                bordure : {BORDER_LABELS[template.design.borderStyle ?? "NONE"].toLowerCase()} · {template.design.pageFormat === "LETTER" ? "Letter" : "A4"}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewing(template)}>
                  Aperçu
                </Button>
                <Button
                  size="sm"
                  disabled={install.isPending}
                  onClick={() => install.mutate({ id: template.id, makeDefault })}
                >
                  Utiliser ce modèle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}
