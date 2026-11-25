"use client";

import { ArrowLeft, ClipboardList, Download, Eye } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { downloadAttemptsCsv } from "../api/assessments.api";
import { useAttemptsPage, useExam } from "../hooks/useAssessment";
import type { AttemptFilters, ExamAttempt } from "../schemas/attempts.schema";
import {
  ATTEMPT_STATUS_LABELS,
  attemptStatusSchema,
  EMPTY_ATTEMPT_FILTERS,
  formatAttemptDate,
  formatScore,
} from "../schemas/attempts.schema";

import { AttemptDetailDialog } from "./AttemptDetailDialog";
import { GrantAttemptsDialog } from "./GrantAttemptsDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { learnerLabel } from "@/features/enrollments/schemas/enrollment.schema";

const ALL = "ALL";

function attemptLearner(a: ExamAttempt): string {
  return learnerLabel({ userId: a.enrollmentId, learnerName: a.learnerName, email: a.email });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Tentatives d'examen final (ENT-37) : liste filtrée et paginée côté serveur (apprenant, statut, dates),
 * export CSV serveur, détail en lecture seule et octroi de tentatives supplémentaires (ENT-31).
 */
export function ExamAttemptsPage({ courseId }: { courseId: string }) {
  const { data: exam, isLoading: examLoading } = useExam(courseId);
  const [filters, setFilters] = useState<AttemptFilters>(EMPTY_ATTEMPT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAttemptsPage(exam?.id, filters, page, pageSize);
  const invalidRange = filters.from !== "" && filters.to !== "" && filters.from > filters.to;

  function update(patch: Partial<AttemptFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  async function exportCsv() {
    if (!exam) return;
    setExporting(true);
    setExportError(null);
    try {
      saveBlob(await downloadAttemptsCsv(exam.id, filters), "tentatives-examen.csv");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  }

  const columns = useMemo<DataTableColumn<ExamAttempt>[]>(
    () => [
      {
        id: "learner",
        header: "Apprenant",
        accessor: attemptLearner,
        cell: (a) => <span className="font-medium">{attemptLearner(a)}</span>,
        hideable: false,
        mobile: "primary",
      },
      {
        id: "score",
        header: "Note",
        accessor: (a) => a.scorePercent ?? null,
        cell: (a) => formatScore(a.scorePercent),
        align: "right",
      },
      {
        id: "status",
        header: "Statut",
        accessor: (a) => ATTEMPT_STATUS_LABELS[a.status],
        cell: (a) => (
          <Badge variant={a.status === "PASSED" ? "success" : a.status === "FAILED" || a.status === "EXPIRED" ? "danger" : "info"}>
            {ATTEMPT_STATUS_LABELS[a.status]}
          </Badge>
        ),
      },
      {
        id: "startedAt",
        header: "Date",
        accessor: (a) => a.startedAt,
        cell: (a) => formatAttemptDate(a.startedAt),
      },
    ],
    [],
  );

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/courses/${courseId}/exam`} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-brand">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;examen final
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Tentatives d&apos;examen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Une ligne par tentative, tous apprenants confondus.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attempt-status">Statut</Label>
          <Select
            value={filters.status === "" ? ALL : filters.status}
            onValueChange={(value) => update({ status: value === ALL ? "" : attemptStatusSchema.parse(value) })}
          >
            <SelectTrigger id="attempt-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les statuts</SelectItem>
              {attemptStatusSchema.options.map((status) => (
                <SelectItem key={status} value={status}>
                  {ATTEMPT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attempt-from">Du</Label>
          <Input id="attempt-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attempt-to">Au</Label>
          <Input id="attempt-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" variant="outline" disabled={!hasFilters} onClick={() => update(EMPTY_ATTEMPT_FILTERS)}>
            Réinitialiser
          </Button>
          <Button type="button" variant="outline" disabled={!exam || exporting || invalidRange} onClick={() => void exportCsv()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
        {invalidRange && <p className="text-xs text-danger sm:col-span-2 lg:col-span-4">La date de début doit précéder la date de fin.</p>}
        {exportError && <p className="text-xs text-danger sm:col-span-2 lg:col-span-4">{exportError}</p>}
      </div>

      <DataTable
        data={invalidRange ? [] : data?.items}
        columns={columns}
        getRowId={(a) => a.id}
        isLoading={isLoading || examLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="tentatives-examen"
        stateKey="exam-attempts"
        searchPlaceholder="Rechercher par nom ou e-mail…"
        rowActions={(a) => (
          <div className="flex items-center justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDetailId(a.id)} aria-label={`Voir le détail de ${attemptLearner(a)}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
            <GrantAttemptsDialog courseId={courseId} enrollmentId={a.enrollmentId} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={ClipboardList}
            message={exam === null ? "Aucun examen n'est configuré pour cette formation." : hasFilters ? "Aucune tentative pour ces filtres." : "Aucune tentative d'examen pour le moment."}
          />
        }
        server={{
          total: invalidRange ? 0 : (data?.total ?? 0),
          page,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(Math.min(size, 100));
            setPage(1);
          },
          search: filters.learner,
          onSearchChange: (q) => update({ learner: q }),
        }}
      />

      <AttemptDetailDialog examId={exam?.id} attemptId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
