"use client";

import { FileText } from "lucide-react";

import { AttestationsTab } from "./AttestationsTab";
import { CertificatesTab } from "./CertificatesTab";
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { LibraryTab } from "./LibraryTab";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCertificateTemplates } from "@/features/certificates/hooks/useCertificates";
import type { CertificateTemplate } from "@/features/certificates/schemas/certificate.schema";

const TEMPLATE_COLUMNS: DataTableColumn<CertificateTemplate>[] = [
  {
    id: "name",
    header: "Modèle",
    accessor: (template) => template.name,
    cell: (template) => <span className="font-medium">{template.name}</span>,
    hideable: false,
    mobile: "primary",
  },
  {
    id: "isDefault",
    header: "Par défaut",
    accessor: (template) => (template.isDefault ? "Par défaut" : ""),
    exportValue: (template) => (template.isDefault ? "Oui" : "Non"),
    cell: (template) => (template.isDefault ? <Badge variant="success">Par défaut</Badge> : "—"),
  },
];

function TemplatesTab() {
  const { data: templates, isLoading, isError, error, refetch } = useCertificateTemplates();

  return (
    <DataTable
      data={templates}
      columns={TEMPLATE_COLUMNS}
      getRowId={(template) => template.id}
      isLoading={isLoading}
      error={isError ? error : undefined}
      onRetry={() => void refetch()}
      title="modeles-certificats"
      stateKey="certificate-templates"
      searchPlaceholder="Rechercher un modèle…"
      toolbarActions={<CreateTemplateDialog />}
      emptyState={
        <EmptyState icon={FileText} message="Aucun modèle de certificat. Créez-en un pour émettre des certificats." />
      }
    />
  );
}

/** Certificats (ENT-38 à ENT-45): certificats émis, révocation / réémission, modèles. */
export function CertificatesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Certificats"
        description="Certificats délivrés à vos apprenants et modèles de mise en page."
      />

      <Tabs defaultValue="issued">
        <TabsList>
          <TabsTrigger value="issued">Certificats émis</TabsTrigger>
          <TabsTrigger value="attestations">Attestations</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="library">Bibliothèque</TabsTrigger>
        </TabsList>
        <TabsContent value="issued">
          <CertificatesTab />
        </TabsContent>
        <TabsContent value="attestations">
          <AttestationsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
