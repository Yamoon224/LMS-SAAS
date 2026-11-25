"use client";

import { FileUp, Loader2, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import { useLesson } from "../hooks/useLesson";
import { useMediaStatus } from "../hooks/useMediaStatus";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { useRemoveLessonMedia } from "../hooks/useRemoveLessonMedia";
import type { ResourceType } from "../schemas/lesson.schema";
import { acceptAttribute, formatBytes, MEDIA_STATUS_LABELS } from "../schemas/media.schema";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface LessonMediaPanelProps {
  moduleId: string;
  lessonId: string;
  resourceType: ResourceType;
  downloadAllowed: boolean;
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{percent} %</p>
    </div>
  );
}

/** État du fichier rattaché : en analyse, en transcodage, prêt, échec, refusé (ENT-24). */
function CurrentMedia({ mediaAssetId, onRemove, removing }: { mediaAssetId: string; onRemove: () => void; removing: boolean }) {
  const { data: media } = useMediaStatus(mediaAssetId);
  if (!media) return <p className="text-xs text-muted-foreground">Chargement de l&apos;état du fichier…</p>;
  const bad = media.status === "FAILED" || media.status === "REJECTED";
  const pending = media.status !== "READY" && !bad;
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-border p-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{media.filename}</p>
        <p className={bad ? "text-xs text-danger" : "text-xs text-muted-foreground"} role="status" aria-live="polite">
          {pending && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden="true" />}
          {MEDIA_STATUS_LABELS[media.status]}
          {media.sizeBytes ? ` · ${formatBytes(media.sizeBytes)}` : ""}
          {bad && media.reason ? ` — ${media.reason}` : ""}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={removing} onClick={onRemove} aria-label={`Supprimer le fichier ${media.filename}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Fichier d'une leçon (ENT-24) : choix du fichier avec contrôle local du type et de la taille, barre de progression,
 * annulation, état (analyse / transcodage / prêt / échec) et suppression.
 */
export function LessonMediaPanel({ moduleId, lessonId, resourceType, downloadAllowed }: LessonMediaPanelProps) {
  const { data: lesson } = useLesson(moduleId, lessonId);
  const upload = useMediaUpload({ moduleId, lessonId, resourceType, downloadAllowed });
  const remove = useRemoveLessonMedia(moduleId, lessonId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const mediaAssetId = lesson?.mediaAssetId ?? null;

  return (
    <div className="flex flex-col gap-2 rounded border border-border p-3">
      <p className="text-sm font-medium">Fichier de la leçon</p>

      {mediaAssetId && !upload.isBusy && (
        <CurrentMedia mediaAssetId={mediaAssetId} removing={remove.isPending} onRemove={() => setConfirmRemove(true)} />
      )}

      {upload.isBusy ? (
        <div className="flex flex-col gap-2">
          <ProgressBar percent={upload.phase === "finalizing" ? 100 : upload.percent} label="Progression du téléversement" />
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {upload.phase === "finalizing" ? "Finalisation…" : "Envoi du fichier…"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={upload.cancel} disabled={upload.phase === "finalizing"}>
            <X className="h-4 w-4" /> Annuler le téléversement
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept={acceptAttribute(resourceType)}
            aria-label="Choisir un fichier"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload.start(file);
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <FileUp className="h-4 w-4" /> {mediaAssetId ? "Remplacer le fichier" : "Choisir un fichier"}
          </Button>
        </div>
      )}

      {upload.error && (
        <p role="alert" className="text-xs text-danger">
          {upload.error}
        </p>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Supprimer le fichier ?"
        description="Le fichier sera retiré de la leçon et supprimé du stockage. Cette action est irréversible."
        confirmLabel="Supprimer"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSettled: () => setConfirmRemove(false) })}
      />
    </div>
  );
}
