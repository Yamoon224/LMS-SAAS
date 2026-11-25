"use client";

import { useState } from "react";

import { useCourseTranslations, useEnabledLanguages, useSetTranslationPublished } from "../hooks/useAiTranslation";
import type { CourseTranslation } from "../schemas/ai-translation.schema";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface PendingChange {
  translation: CourseTranslation;
  publish: boolean;
}

function TranslationRow({
  translation,
  languageName,
  onChange,
}: {
  translation: CourseTranslation;
  languageName: string;
  onChange: (change: PendingChange) => void;
}) {
  const published = translation.status === "PUBLISHED";
  const partial = translation.coveragePercent < 100;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {languageName} <span className="text-xs uppercase text-muted-foreground">{translation.locale}</span>
          <Badge variant={published ? "success" : "warning"}>{published ? "Publiée" : "Brouillon"}</Badge>
          {translation.origin === "AI" && <Badge variant="secondary">Traduit par IA</Badge>}
        </p>
        <p className="text-sm text-muted-foreground">
          {translation.lessonsTranslated} leçon(s) traduite(s) sur {translation.lessonsTotal} (
          {translation.coveragePercent} %)
          {partial && " — les autres s'afficheront dans la langue d'origine."}
        </p>
      </div>
      <Button
        size="sm"
        variant={published ? "outline" : "default"}
        disabled={!published && translation.lessonsTranslated === 0}
        onClick={() => onChange({ translation, publish: !published })}
      >
        {published ? "Retirer" : "Publier"}
      </Button>
    </li>
  );
}

/**
 * PUB-17 : traductions d'une formation. Une traduction IA reste en brouillon tant que le gestionnaire ne l'a pas
 * relue et publiée ; la publication vaut pour toute la formation (fiche et leçons) dans cette langue.
 */
export function CourseTranslations({ courseId }: { courseId: string }) {
  const translations = useCourseTranslations(courseId);
  const languages = useEnabledLanguages();
  const setPublished = useSetTranslationPublished(courseId);
  const [pending, setPending] = useState<PendingChange | null>(null);

  if (translations.isLoading) return <Skeleton className="h-24" />;
  if (translations.isError) {
    return <ErrorBanner title="Impossible de charger les traductions." error={translations.error} />;
  }
  if (!translations.data || translations.data.length === 0) return null;

  const nameOf = (code: string) => languages.data?.find((language) => language.code === code)?.nativeName ?? code;

  async function confirm() {
    if (!pending) return;
    try {
      await setPublished.mutateAsync({ locale: pending.translation.locale, published: pending.publish });
      setPending(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <section aria-labelledby="translations-title" className="rounded-lg border border-border bg-surface p-4">
      <h2 id="translations-title" className="text-base font-semibold">
        Traductions disponibles pour les apprenants
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Relisez la traduction avant de la publier : tant qu&apos;elle est en brouillon, les apprenants ne la voient pas.
        Une nouvelle traduction d&apos;une langue déjà publiée repasse en brouillon.
      </p>
      <ul className="mt-2 divide-y divide-border">
        {translations.data.map((translation) => (
          <TranslationRow
            key={translation.locale}
            translation={translation}
            languageName={nameOf(translation.locale)}
            onChange={setPending}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.publish ? "Publier cette traduction" : "Retirer cette traduction"}
        description={
          pending?.publish
            ? `Les apprenants pourront lire la formation en ${nameOf(pending.translation.locale)}. Seules les leçons traduites seront concernées.`
            : `Les apprenants ne pourront plus choisir cette langue ; leur progression est conservée.`
        }
        confirmLabel={pending?.publish ? "Publier" : "Retirer"}
        destructive={pending?.publish === false}
        isPending={setPublished.isPending}
        onConfirm={() => void confirm()}
      />
    </section>
  );
}
