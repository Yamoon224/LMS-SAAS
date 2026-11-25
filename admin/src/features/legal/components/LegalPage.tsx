"use client";

import { useState } from "react";

import { useLegalDocuments, usePublishLegalDocument } from "../hooks/useLegal";
import { LEGAL_TYPE_LABELS, LEGAL_TYPES } from "../schemas/legal.schema";
import type { LegalDocument, LegalType } from "../schemas/legal.schema";

import { LegalDraftDialog } from "./LegalDraftDialog";
import type { LegalDraftTarget } from "./LegalDraftDialog";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

interface VersionRowProps {
  document: LegalDocument;
  isCurrent: boolean;
  onEdit: (document: LegalDocument) => void;
  onPublish: (document: LegalDocument) => void;
}

function VersionRow({ document, isCurrent, onEdit, onPublish }: VersionRowProps) {
  const published = document.publishedAt !== null;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          Version {document.version}
          {isCurrent && <Badge variant="success">Version courante</Badge>}
          {!published && <Badge variant="warning">Brouillon</Badge>}
          {published && !isCurrent && <Badge variant="secondary">Remplacée</Badge>}
        </p>
        <p className="text-sm text-muted-foreground">
          {document.title} ·{" "}
          {published ? `publiée le ${formatDate(document.publishedAt)}` : `créée le ${formatDate(document.createdAt)}`}
          {published ? ` · acceptée ${document.acceptancesCount} fois` : ""}
        </p>
      </div>
      {!published && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(document)}>
            Modifier
          </Button>
          <Button size="sm" onClick={() => onPublish(document)}>
            Publier
          </Button>
        </div>
      )}
    </li>
  );
}

function TypeSection({
  type,
  documents,
  onCreate,
  onEdit,
  onPublish,
}: {
  type: LegalType;
  documents: LegalDocument[];
  onCreate: (type: LegalType, seed?: LegalDocument) => void;
  onEdit: (document: LegalDocument) => void;
  onPublish: (document: LegalDocument) => void;
}) {
  const ordered = [...documents].sort((a, b) => b.version - a.version);
  const current = ordered.find((document) => document.publishedAt !== null);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{LEGAL_TYPE_LABELS[type]}</CardTitle>
          <CardDescription>
            {current ? `Version courante : ${current.version}` : "Aucune version publiée : cette page n'est pas disponible au public."}
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => onCreate(type, ordered[0])}>
          Nouvelle version
        </Button>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune version pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ordered.map((document) => (
              <VersionRow
                key={document.id}
                document={document}
                isCurrent={document.id === current?.id}
                onEdit={onEdit}
                onPublish={onPublish}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** ADM-41 : CGU, CGV et politique de confidentialité — brouillons, publication et acceptations. */
export function LegalPage() {
  const { data, isLoading, isError, error } = useLegalDocuments();
  const publish = usePublishLegalDocument();
  const [draftTarget, setDraftTarget] = useState<LegalDraftTarget | null>(null);
  const [publishing, setPublishing] = useState<LegalDocument | null>(null);

  async function confirmPublish() {
    if (!publishing) return;
    try {
      await publish.mutateAsync(publishing.id);
      setPublishing(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger les pages légales." error={error} />;

  return (
    <div className="flex flex-col gap-6">
      {LEGAL_TYPES.map((type) => (
        <TypeSection
          key={type}
          type={type}
          documents={data.filter((document) => document.type === type)}
          onCreate={(selected, seed) => setDraftTarget({ mode: "create", type: selected, seed })}
          onEdit={(document) => setDraftTarget({ mode: "edit", document })}
          onPublish={setPublishing}
        />
      ))}
      <LegalDraftDialog target={draftTarget} onOpenChange={(open) => !open && setDraftTarget(null)} />
      <ConfirmDialog
        open={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        title="Publier cette version"
        description={
          publishing
            ? `La version ${publishing.version} deviendra la version courante et ne pourra plus être modifiée. Pour la corriger, il faudra créer une nouvelle version.`
            : ""
        }
        confirmLabel="Publier"
        destructive={false}
        isPending={publish.isPending}
        onConfirm={() => void confirmPublish()}
      />
    </div>
  );
}
