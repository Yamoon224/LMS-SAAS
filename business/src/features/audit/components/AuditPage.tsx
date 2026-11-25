"use client";

import { History } from "lucide-react";
import { useCallback, useState } from "react";

import { fetchAuditEntries } from "../api/audit.api";
import { useAuditEntries } from "../hooks/useAuditEntries";
import { EMPTY_AUDIT_FILTERS } from "../schemas/audit.schema";
import type { AuditEntry, AuditFilters } from "../schemas/audit.schema";

import { AuditFiltersForm } from "./AuditFiltersForm";

import { DataTable, filterRows } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useBusinessUsers } from "@/features/users/hooks/useBusinessUsers";
import { formatDateTime } from "@/lib/format";

/** L'API accepte take ≤ 200 ; l'export parcourt le journal par tranches, plafonné à 5000 lignes. */
const EXPORT_BATCH = 200;
const EXPORT_CAP = 5000;

function objectLabel(entry: AuditEntry): string {
  return `${entry.objectType}${entry.objectId ? ` · ${entry.objectId.slice(0, 8)}…` : ""}`;
}

/**
 * Journal d’activité (RG-19) : DataTable en mode SERVEUR (take/skip), filtrable par action, type d’objet et dates.
 * Le backend n’a pas de paramètre de recherche libre : la recherche du tableau filtre la page chargée côté client.
 */
export function AuditPage() {
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useAuditEntries(filters, pageSize, page * pageSize);
  // Résolution facultative des auteurs (nécessite le droit « Utilisateurs & rôles » : silencieux si refusé).
  const { data: users } = useBusinessUsers();
  const actorNames = new Map((users ?? []).map((user) => [user.id, user.fullName || user.email]));

  const hasFilters = Object.values(filters).some(Boolean);

  const actorLabel = useCallback(
    (entry: AuditEntry) =>
      entry.actorId ? (actorNames.get(entry.actorId) ?? `${entry.actorId.slice(0, 8)}…`) : "Système",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users],
  );

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      id: "createdAt",
      header: "Date",
      accessor: (entry) => entry.createdAt,
      cell: (entry) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.createdAt)}</span>,
      hideable: false,
      mobile: "secondary",
    },
    { id: "actor", header: "Auteur", accessor: actorLabel, cell: actorLabel },
    {
      id: "action",
      header: "Action",
      accessor: (entry) => entry.action,
      cell: (entry) => (
        <Badge variant="secondary" className="font-mono">
          {entry.action}
        </Badge>
      ),
      mobile: "primary",
    },
    { id: "object", header: "Objet", accessor: objectLabel, cell: objectLabel },
    {
      id: "objectId",
      header: "Identifiant objet",
      accessor: (entry) => entry.objectId ?? "",
      cell: (entry) => <span className="font-mono text-xs">{entry.objectId ?? "—"}</span>,
      defaultHidden: true,
      mobile: "hidden",
    },
  ];

  const rows = data ? filterRows(data.entries, columns, search) : undefined;

  async function fetchAllForExport(): Promise<AuditEntry[]> {
    const all: AuditEntry[] = [];
    let total = Infinity;
    while (all.length < Math.min(total, EXPORT_CAP)) {
      const batch = await fetchAuditEntries(filters, EXPORT_BATCH, all.length);
      total = batch.total;
      if (batch.entries.length === 0) break;
      all.push(...batch.entries);
    }
    return filterRows(all.slice(0, EXPORT_CAP), columns, search);
  }

  function reset() {
    setDraft(EMPTY_AUDIT_FILTERS);
    setFilters(EMPTY_AUDIT_FILTERS);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journal d’activité"
        description="Historique en lecture seule des actions effectuées dans votre entreprise."
      />

      <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(entry) => entry.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          title="journal-activite"
          stateKey="audit"
          searchPlaceholder="Rechercher dans la page"
          filters={
            <div className="w-full">
              <AuditFiltersForm
                draft={draft}
                setDraft={setDraft}
                canReset={hasFilters || Object.values(draft).some(Boolean)}
                onApply={() => {
                  setFilters(draft);
                  setPage(0);
                }}
                onReset={reset}
              />
            </div>
          }
          emptyState={
            <EmptyState icon={History} message={hasFilters ? "Aucune entrée pour ces filtres." : "Aucune activité enregistrée."} />
          }
          server={{
            total: data?.total ?? 0,
            page: page + 1,
            pageSize,
            onPageChange: (next) => setPage(next - 1),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(0);
            },
            search,
            onSearchChange: setSearch,
            fetchAllForExport,
          }}
        />
      </div>
    </div>
  );
}
