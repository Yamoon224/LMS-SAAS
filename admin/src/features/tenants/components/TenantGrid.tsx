"use client";

import { Globe2 } from "lucide-react";
import Link from "next/link";

import type { Tenant } from "../schemas/tenant.schema";

import type { TenantAction } from "./TenantActionDialogs";
import { TenantLogo } from "./TenantLogo";
import { TenantRowActions } from "./TenantRowActions";
import { TenantStatusBadge } from "./TenantStatusBadge";

import { Card } from "@/components/ui/card";
import { cardSpans } from "@/lib/card-grid";
import { tenantHost } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Vue « grille » des entreprises : une carte par entreprise (logo, statut, pays, devise, actions). */
export function TenantGrid({ tenants, onAction }: { tenants: Tenant[]; onAction: (action: NonNullable<TenantAction>) => void }) {
  const spans = cardSpans(tenants.length);

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {tenants.map((tenant, index) => (
        <li key={tenant.id} className={cn("flex", spans[index])}>
          <Card className="flex w-full flex-col gap-4 border-b-4 border-b-brand p-4 transition-shadow hover:shadow-card-hover">
            <div className="flex items-start gap-3">
              <TenantLogo name={tenant.name} logoUrl={tenant.logoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <Link href={`/tenants/${tenant.id}`} className="block truncate font-display font-semibold hover:underline focus-visible:underline">
                  {tenant.name}
                </Link>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Globe2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tenantHost(tenant.slug)}</span>
                </p>
              </div>
              <TenantRowActions tenant={tenant} onAction={onAction} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TenantStatusBadge status={tenant.status} />
            </div>

            <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Pays</dt>
                <dd className="font-medium">{tenant.country}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Devise</dt>
                <dd className="font-medium">{tenant.currency}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Créée le</dt>
                <dd className="font-medium">{formatDate(tenant.createdAt)}</dd>
              </div>
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  );
}
