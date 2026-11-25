"use client";

import { FileClock } from "lucide-react";

import { TenantTabState } from "./TenantTabState";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantAudit } from "@/features/tenants/hooks/useTenantOverview";
import { humanizeAuditAction } from "@/features/tenants/schemas/tenant-overview.schema";
import { formatDateTime } from "@/lib/format";

/** ADM-10 — Journal d'audit de l'entreprise (100 entrées les plus récentes) ; le journal complet reste dans « Journal d'audit ». */
export function TenantAuditTab({ tenantId, active }: { tenantId: string; active: boolean }) {
  const query = useTenantAudit(tenantId, active);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d’audit</CardTitle>
        <CardDescription>Les 100 actions sensibles les plus récentes de cette entreprise.</CardDescription>
      </CardHeader>
      <CardContent>
        <TenantTabState
          query={query}
          errorTitle="Impossible de charger le journal d’audit."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter le journal d’audit."
        >
          {(entries) =>
            entries.length === 0 ? (
              <EmptyState icon={FileClock} message="Aucune action n’a encore été journalisée pour cette entreprise." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead>Acteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{humanizeAuditAction(entry.action)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{entry.action}</p>
                      </TableCell>
                      <TableCell>
                        {entry.objectType}
                        <p className="break-all font-mono text-xs text-muted-foreground">{entry.objectId}</p>
                      </TableCell>
                      <TableCell>{entry.actorName ?? "Système"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          }
        </TenantTabState>
      </CardContent>
    </Card>
  );
}
