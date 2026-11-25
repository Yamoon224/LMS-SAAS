"use client";

import { Building2, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Tenant, TenantStatus } from "../schemas/tenant.schema";

import { useTenantActionDialogs } from "./TenantActionDialogs";
import { TenantGrid } from "./TenantGrid";
import { TenantLogo } from "./TenantLogo";
import { TenantRowActions } from "./TenantRowActions";
import { TenantStatusBadge } from "./TenantStatusBadge";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTenantButton } from "@/features/tenants/components/NewTenantButton";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "grid";
const VIEW_STORAGE_KEY = "tenants-view";
const PAGE_SIZE_STORAGE_KEY = "tenants-grid-page-size";
/** Multiples de 6 : la grille a 1, 2 ou 3 cartes par ligne, donc une page pleine n'a jamais de ligne incomplète. */
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const STATUS_LABELS: Record<TenantStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

export function TenantList() {
  const { data: tenants, isLoading, isError, error, refetch } = useTenants();
  const { setAction, dialogs } = useTenantActionDialogs();

  const columns: DataTableColumn<Tenant>[] = [
    {
      id: "name",
      header: "Entreprise",
      accessor: (tenant) => tenant.name,
      cell: (tenant) => (
        <span className="flex items-center gap-2.5">
          <TenantLogo name={tenant.name} logoUrl={tenant.logoUrl} size="sm" />
          <Link href={`/tenants/${tenant.id}`} className="font-medium hover:underline focus-visible:underline">
            {tenant.name}
          </Link>
        </span>
      ),
      mobile: "primary",
    },
    {
      id: "slug",
      header: "Sous-domaine",
      accessor: (tenant) => tenant.slug,
      cell: (tenant) => <span className="text-muted-foreground">{tenant.slug}</span>,
    },
    {
      id: "country",
      header: "Pays",
      accessor: (tenant) => tenant.country,
      cell: (tenant) => <span className="text-muted-foreground">{tenant.country}</span>,
    },
    {
      id: "currency",
      header: "Devise",
      accessor: (tenant) => tenant.currency,
      cell: (tenant) => <span className="text-muted-foreground">{tenant.currency}</span>,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (tenant) => STATUS_LABELS[tenant.status],
      cell: (tenant) => <TenantStatusBadge status={tenant.status} />,
    },
    {
      id: "createdAt",
      header: "Créée le",
      accessor: (tenant) => tenant.createdAt ?? null,
      exportValue: (tenant) => (tenant.createdAt ? formatDate(tenant.createdAt) : null),
      cell: (tenant) => <span className="text-muted-foreground">{formatDate(tenant.createdAt)}</span>,
      defaultHidden: true,
    },
  ];

  const [view, setView] = useState<ViewMode>("list");
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0] ?? 10);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(VIEW_STORAGE_KEY) === "grid") setView("grid");
      const storedSize = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
      if (PAGE_SIZE_OPTIONS.includes(storedSize)) setPageSizeState(storedSize);
    } catch {
      // stockage indisponible : vue liste par défaut
    }
  }, []);

  function chooseView(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // préférence non mémorisée
    }
  }

  function setQuery(value: string) {
    setQueryState(value);
    setPage(1);
  }

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      // préférence non mémorisée
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = tenants ?? [];
    if (!needle) return all;
    return all.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.country, tenant.currency, STATUS_LABELS[tenant.status]].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [tenants, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageTenants = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const emptyState = <EmptyState icon={Building2} message="Aucune entreprise pour le moment." action={<NewTenantButton />} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === "grid" ? (
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher une entreprise…"
            aria-label="Rechercher une entreprise"
            containerClassName="w-full sm:max-w-xs"
          />
        ) : (
          <span />
        )}
        <div role="group" aria-label="Mode d’affichage" className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {(
            [
              { id: "list", label: "Liste", Icon: List },
              { id: "grid", label: "Grille", Icon: LayoutGrid },
            ] as const
          ).map(({ id, label, Icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={view === id}
              onClick={() => chooseView(id)}
              className={cn("gap-1.5", view === id ? "bg-brand text-brand-foreground hover:bg-brand/90" : "text-muted-foreground")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {view === "grid" ? (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Chargement">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-44 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorBanner title="Impossible de charger les entreprises." error={error} onRetry={() => void refetch()} />
        ) : (tenants ?? []).length === 0 ? (
          emptyState
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune entreprise ne correspond à « {query} ».</p>
        ) : (
          <>
            <TenantGrid tenants={pageTenants} onAction={setAction} />
            <DataTablePagination
              page={currentPage}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              total={filtered.length}
              unfilteredTotal={tenants?.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )
      ) : (
      <DataTable
        data={tenants}
        columns={columns}
        getRowId={(tenant) => tenant.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les entreprises."
        title="entreprises"
        searchPlaceholder="Rechercher une entreprise…"
        stateKey="tenants"
        initialSort={{ columnId: "name", direction: "asc" }}
        rowActions={(tenant) => <TenantRowActions tenant={tenant} onAction={setAction} />}
        emptyState={emptyState}
      />
      )}
      {dialogs}
    </div>
  );
}
