"use client";

import { Plus } from "lucide-react";
import { Award } from "lucide-react";
import { useState } from "react";

import { useDeleteLibraryTemplate, useLibraryTemplates, useSetLibraryPublished } from "../hooks/useCertificateLibrary";
import {
  BORDER_LABELS,
  DEFAULT_COLORS,
  FONT_LABELS,
  ORIENTATION_LABELS,
} from "../schemas/certificate-library.schema";
import type { LibraryTemplate } from "../schemas/certificate-library.schema";

import { LibraryTemplateDialog } from "./LibraryTemplateDialog";
import type { LibraryDialogTarget } from "./LibraryTemplateDialog";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-4 w-4 rounded border border-border" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function TemplateCard({
  template,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  template: LibraryTemplate;
  onEdit: (template: LibraryTemplate) => void;
  onTogglePublish: (template: LibraryTemplate) => void;
  onDelete: (template: LibraryTemplate) => void;
}) {
  const { design } = template;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="truncate">{template.name}</CardTitle>
          {template.description && <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>}
        </div>
        <Badge variant={template.isPublished ? "success" : "warning"}>{template.isPublished ? "Publié" : "Brouillon"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Swatch color={design.primaryColor ?? DEFAULT_COLORS.primaryColor} label="Accent" />
          <Swatch color={design.textColor ?? DEFAULT_COLORS.textColor} label="Texte" />
          <Swatch color={design.secondaryColor ?? DEFAULT_COLORS.secondaryColor} label="Secondaire" />
        </div>
        <p className="text-sm text-muted-foreground">
          {FONT_LABELS[design.fontFamily ?? "HELVETICA"]} · {ORIENTATION_LABELS[design.orientation ?? "LANDSCAPE"]} ·
          bordure : {BORDER_LABELS[design.borderStyle ?? "NONE"].toLowerCase()}
        </p>
        {template.warnings.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-warning">
            {template.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
            Modifier
          </Button>
          <Button size="sm" variant={template.isPublished ? "outline" : "default"} onClick={() => onTogglePublish(template)}>
            {template.isPublished ? "Retirer" : "Publier"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(template)}>
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** ADM-39 : bibliothèque de modèles de certificats proposés aux entreprises. */
export function CertificateLibraryPage() {
  const { data, isLoading, isError, error } = useLibraryTemplates();
  const publish = useSetLibraryPublished();
  const remove = useDeleteLibraryTemplate();
  const [dialog, setDialog] = useState<LibraryDialogTarget>(null);
  const [deleting, setDeleting] = useState<LibraryTemplate | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger la bibliothèque." error={error} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button onClick={() => setDialog({})}>
          <Plus aria-hidden="true" />
          Nouveau modèle
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={Award} message="Aucun modèle pour le moment. Créez-en un, prévisualisez-le, puis publiez-le." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={(selected) => setDialog({ template: selected })}
              onTogglePublish={(selected) => publish.mutate({ id: selected.id, published: !selected.isPublished })}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <LibraryTemplateDialog target={dialog} onOpenChange={(open) => !open && setDialog(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer ce modèle"
        description={`« ${deleting?.name ?? ""} » disparaît de la bibliothèque. Les copies déjà installées par des entreprises, et les certificats déjà émis, ne sont pas modifiés.`}
        confirmLabel="Supprimer"
        isPending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
