"use client";

import { FileClock, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { AuditFilters } from "./AuditFilters";

import { DataTable, EXPORT_ROW_LIMIT, matchesSearch, normalizeForSearch } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAuditEntries } from "@/features/audit/api/audit.api";
import { useAuditEntries } from "@/features/audit/hooks/useAuditEntries";
import type { AuditEntry, AuditFiltersValues } from "@/features/audit/schemas/audit.schema";
import { PAGE_SIZE } from "@/features/audit/schemas/audit.schema";
import { formatDateTime } from "@/lib/format";

const EMPTY_FILTERS: AuditFiltersValues = { actorId: "", objectType: "", objectId: "", action: "", from: "", to: "" };

/** Le backend borne `take` à 200 par requête. */
const EXPORT_CHUNK = 200;

const mono = "font-mono text-xs text-muted-foreground break-all";

const columns: DataTableColumn<AuditEntry>[] = [
  {
    id: "createdAt",
    header: "Date",
    accessor: (entry) => entry.createdAt,
    exportValue: (entry) => formatDateTime(entry.createdAt),
    cell: (entry) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "action",
    header: "Action",
    accessor: (entry) => entry.action,
    cell: (entry) => <span className="font-mono text-xs">{entry.action}</span>,
    mobile: "primary",
  },
  { id: "objectType", header: "Type d’objet", accessor: (entry) => entry.objectType, cell: (entry) => entry.objectType },
  {
    id: "objectId",
    header: "Objet",
    accessor: (entry) => entry.objectId,
    cell: (entry) => <span className={mono}>{entry.objectId ?? "—"}</span>,
  },
  {
    id: "actorId",
    header: "Acteur",
    accessor: (entry) => entry.actorId,
    cell: (entry) => <span className={mono}>{entry.actorId ?? "—"}</span>,
  },
  {
    id: "tenantId",
    header: "Entreprise",
    accessor: (entry) => entry.tenantId,
    cell: (entry) => <span className={mono}>{entry.tenantId ?? "—"}</span>,
    mobile: "hidden",
  },
];

function entryText(entry: AuditEntry): string {
  return normalizeForSearch(
    [entry.action, entry.objectType, entry.objectId, entry.actorId, entry.tenantId, formatDateTime(entry.createdAt)]
      .filter(Boolean)
      .join(" "),
  );
}

function activeFilterCount(filters: AuditFiltersValues): number {
  return Object.values(filters).filter(Boolean).length;
}

/**
 * Journal d'audit en mode serveur (take / skip). Le backend n'a pas de recherche libre : la barre de recherche
 * filtre côté client les lignes de la page chargée (et les lignes exportées).
 */
export function AuditLogTable() {
  const [filters, setFilters] = useState<AuditFiltersValues>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useAuditEntries({
    ...filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  function applyFilters(values: AuditFiltersValues) {
    setFilters(values);
    setPage(1);
  }

  const searching = search.trim().length > 0;
  const entries = data?.entries;
  const visibleEntries = searching ? entries?.filter((entry) => matchesSearch(entryText(entry), search)) : entries;

  async function fetchAllForExport(): Promise<AuditEntry[]> {
    const collected: AuditEntry[] = [];
    let skip = 0;
    let total = Infinity;
    // On lit une ligne de plus que le plafond pour savoir si la liste a été tronquée.
    while (skip < total && collected.length <= EXPORT_ROW_LIMIT) {
      const chunk = await fetchAuditEntries({ ...filters, skip, take: EXPORT_CHUNK });
      total = chunk.total;
      collected.push(...chunk.entries);
      skip += EXPORT_CHUNK;
      if (chunk.entries.length === 0) break;
    }
    return searching ? collected.filter((entry) => matchesSearch(entryText(entry), search)) : collected;
  }

  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-4">
      {filtersOpen && <AuditFilters defaultValues={filters} onApply={applyFilters} />}

      <DataTable
        data={visibleEntries}
        columns={columns}
        getRowId={(entry) => entry.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger le journal d’audit."
        title="journal-audit"
        searchPlaceholder="Rechercher dans la page"
        stateKey="audit-log"
        pageSizeOptions={[10, 25, 50, 100]}
        filters={
          <Button
            type="button"
            variant="outline"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtres
            {count > 0 && <Badge className="ml-1 px-1.5">{count}</Badge>}
          </Button>
        }
        emptyState={<EmptyState icon={FileClock} message="Aucune entrée pour ces filtres." />}
        server={{
          // Pendant une recherche, seules les lignes de la page chargée sont comptées.
          total: searching ? (visibleEntries?.length ?? 0) : (data?.total ?? 0),
          page: searching ? 1 : page,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          search,
          onSearchChange: setSearch,
          fetchAllForExport,
        }}
      />
    </div>
  );
}
