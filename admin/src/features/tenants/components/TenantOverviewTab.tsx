"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { EditBrandingDialog } from "./EditBrandingDialog";
import { EditTenantDialog } from "./EditTenantDialog";
import { TenantPayoutAccountCard } from "./TenantPayoutAccountCard";
import { InfoField } from "./TenantTabState";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/features/session/hooks/useSession";
import { USER_STATUS_LABELS, USER_STATUS_VARIANTS } from "@/features/tenants/schemas/tenant-overview.schema";
import type { TenantOverview } from "@/features/tenants/schemas/tenant-overview.schema";
import { tenantHost } from "@/lib/domain";
import { formatDate, formatDateTime } from "@/lib/format";

/** ADM-10 — Aperçu : identité, statut, contacts, charte graphique, reversement. */
export function TenantOverviewTab({
  overview,
  canReadPayout,
}: {
  overview: TenantOverview;
  canReadPayout: boolean;
}) {
  const { tenant, branding, contacts } = overview;
  const { can } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Informations générales</CardTitle>
          {can("tenants.update") && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Modifier
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoField label="Pays">{tenant.country}</InfoField>
            <InfoField label="Devise">{tenant.currency}</InfoField>
            <InfoField label="Langue par défaut">{tenant.defaultLocale}</InfoField>
            <InfoField label="Créée le">{formatDate(tenant.createdAt)}</InfoField>
            <InfoField label="Adresse">{tenantHost(tenant.slug)}</InfoField>
            <InfoField label="Paiement hors plateforme">{tenant.offlinePaymentEnabled ? "Activé" : "Désactivé"}</InfoField>
            <InfoField label="Compte de reversement">
              <Badge variant={tenant.payoutAccountVerified ? "success" : "warning"}>
                {tenant.payoutAccountVerified ? "Vérifié" : "Non vérifié"}
              </Badge>
            </InfoField>
            {tenant.archivedAt && <InfoField label="Archivée le">{formatDateTime(tenant.archivedAt)}</InfoField>}
            <div className="col-span-2 sm:col-span-4">
              <InfoField label="Identifiant" mono>
                {tenant.id}
              </InfoField>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="E-mail de l’entreprise">{tenant.contactEmail ?? "—"}</InfoField>
              <InfoField label="Téléphone">{tenant.contactPhone ?? "—"}</InfoField>
            </dl>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Propriétaire(s)</p>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun propriétaire rattaché à cette entreprise.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {contacts.map((contact) => (
                    <li key={contact.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{contact.fullName}</p>
                        <p className="break-all text-xs text-muted-foreground">
                          {contact.email}
                          {contact.phone ? ` · ${contact.phone}` : ""}
                        </p>
                      </div>
                      <Badge variant={USER_STATUS_VARIANTS[contact.status]}>{USER_STATUS_LABELS[contact.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Identité visuelle</CardTitle>
            {can("tenants.update") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setBrandingOpen(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                // Logo téléversé par l'entreprise : URL libre, donc <img> et non next/image.
                <img src={branding.logoUrl} alt={`Logo de ${tenant.name}`} className="h-12 w-12 rounded-lg border border-border object-contain" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  Aucun
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">Logo</p>
                <p className="text-xs text-muted-foreground">{branding.logoUrl ? "Défini par l’entreprise" : "Non défini"}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Couleur principale">
                {branding.primaryColor ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded border border-border"
                      style={{ backgroundColor: branding.primaryColor }}
                      aria-hidden="true"
                    />
                    {branding.primaryColor}
                  </span>
                ) : (
                  "—"
                )}
              </InfoField>
              <InfoField label="Bannière">{branding.bannerUrl ? "Définie" : "—"}</InfoField>
            </dl>
            {branding.description && <p className="break-words text-sm text-muted-foreground">{branding.description}</p>}
          </CardContent>
        </Card>
      </div>

      {canReadPayout && <TenantPayoutAccountCard tenantId={tenant.id} />}

      <EditTenantDialog tenant={tenant} open={editOpen} onOpenChange={setEditOpen} />
      <EditBrandingDialog tenantId={tenant.id} name={tenant.name} open={brandingOpen} onOpenChange={setBrandingOpen} />
    </div>
  );
}
