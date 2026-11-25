"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Languages } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreditBalance, useTranslationFlow, useTranslationJobs } from "../hooks/useAiTranslation";
import type { EstimateTranslationValues, TranslationEstimate, TranslationJob, TranslationJobStatus } from "../schemas/ai-translation.schema";
import { estimateTranslationSchema, TRANSLATION_JOB_STATUS_LABELS } from "../schemas/ai-translation.schema";

import { CourseTranslations } from "./CourseTranslations";
import { TargetLocaleSelect } from "./TargetLocaleSelect";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CourseSelect } from "@/features/courses/components/CourseSelect";
import { ApiError } from "@/lib/api-client";

const JOB_VARIANTS: Record<TranslationJobStatus, BadgeProps["variant"]> = {
  ESTIMATED: "secondary",
  CONFIRMED: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  FAILED: "danger",
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

function EstimateStep({ courseId }: { courseId: string }) {
  const [estimate, setEstimate] = useState<TranslationEstimate | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { estimate: estimateMutation, confirm } = useTranslationFlow(courseId);
  const balance = useCreditBalance();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EstimateTranslationValues>({
    resolver: zodResolver(estimateTranslationSchema),
    defaultValues: { targetLocale: "" },
  });

  async function onEstimate(values: EstimateTranslationValues) {
    setActionError(null);
    setConfirmed(false);
    try {
      setEstimate(await estimateMutation.mutateAsync(values));
    } catch (err) {
      setEstimate(null);
      setActionError(messageOf(err, "Estimation impossible."));
    }
  }

  async function onConfirm() {
    if (!estimate) return;
    setActionError(null);
    try {
      await confirm.mutateAsync(estimate.id);
      setConfirmed(true);
    } catch (err) {
      setActionError(messageOf(err, "Confirmation impossible."));
    }
  }

  const credits = estimate?.estimatedCredits ?? 0;
  const insufficient = balance.data !== undefined && credits > balance.data;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <form onSubmit={handleSubmit(onEstimate)} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetLocale">Langue cible</Label>
          <TargetLocaleSelect registration={register("targetLocale")} invalid={Boolean(errors.targetLocale)} />
          {errors.targetLocale && <p className="text-xs text-danger">{errors.targetLocale.message}</p>}
        </div>
        <Button type="submit" variant="outline" disabled={estimateMutation.isPending}>
          {estimateMutation.isPending && <Spinner />}
          Estimer le coût
        </Button>
      </form>

      {estimate && !confirmed && (
        <div className="flex flex-col gap-3 rounded border border-border bg-muted/30 p-3 text-sm">
          <p>
            Traduction vers <strong>{estimate.targetLocale}</strong>
            {estimate.wordCount != null && <> ({estimate.wordCount.toLocaleString("fr-FR")} mots)</>} :{" "}
            <strong>{credits.toLocaleString("fr-FR")} crédits</strong>.
          </p>
          <p className="text-muted-foreground">
            Solde actuel : {balance.data !== undefined ? balance.data.toLocaleString("fr-FR") : "…"} crédits. La
            confirmation débite immédiatement les crédits estimés.
          </p>
          {insufficient && (
            <p className="text-danger">Crédits insuffisants: achetez un pack dans l&apos;onglet Crédits.</p>
          )}
          <div>
            <Button onClick={() => void onConfirm()} disabled={confirm.isPending || insufficient}>
              {confirm.isPending && <Spinner />}
              Confirmer et traduire
            </Button>
          </div>
        </div>
      )}

      {confirmed && (
        <p className="text-sm text-success">Traduction confirmée: les crédits ont été débités, elle est en cours.</p>
      )}
      {actionError && <ErrorBanner title={actionError} />}
    </div>
  );
}

const creditsLabel = (job: TranslationJob) =>
  job.estimatedCredits != null ? `${job.estimatedCredits.toLocaleString("fr-FR")} crédits` : "—";

const JOB_COLUMNS: DataTableColumn<TranslationJob>[] = [
  {
    id: "targetLocale",
    header: "Langue",
    accessor: (job) => job.targetLocale,
    cell: (job) => <span className="font-medium">{job.targetLocale}</span>,
    hideable: false,
    mobile: "primary",
  },
  {
    id: "estimatedCredits",
    header: "Coût estimé",
    accessor: (job) => job.estimatedCredits ?? null,
    exportValue: (job) => job.estimatedCredits ?? null,
    cell: creditsLabel,
  },
  {
    id: "status",
    header: "Statut",
    accessor: (job) => TRANSLATION_JOB_STATUS_LABELS[job.status],
    cell: (job) => <Badge variant={JOB_VARIANTS[job.status]}>{TRANSLATION_JOB_STATUS_LABELS[job.status]}</Badge>,
  },
];

function JobHistory({ courseId }: { courseId: string }) {
  const { data: jobs, isLoading, isError, error, refetch } = useTranslationJobs(courseId);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Historique des traductions</h2>
      <DataTable
        data={jobs}
        columns={JOB_COLUMNS}
        getRowId={(job) => job.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="traductions"
        stateKey="ai-translation-jobs"
        searchPlaceholder="Rechercher une traduction…"
        emptyState={<EmptyState icon={Languages} message="Aucune traduction pour cette formation." />}
      />
    </div>
  );
}

/** Traduire une formation (ADM-18): estimation du coût, confirmation explicite, historique des jobs. */
export function TranslationPanel() {
  const [courseId, setCourseId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Formation à traduire</Label>
        <CourseSelect value={courseId} onChange={setCourseId} className="w-full sm:w-80" />
      </div>

      {courseId ? (
        // key: repart d'une estimation vierge quand la formation change.
        <>
          <EstimateStep key={courseId} courseId={courseId} />
          <CourseTranslations courseId={courseId} />
          <JobHistory courseId={courseId} />
        </>
      ) : (
        <EmptyState icon={Languages} message="Choisissez une formation pour estimer et lancer une traduction." />
      )}
    </div>
  );
}
