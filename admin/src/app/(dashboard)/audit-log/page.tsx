import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogTable } from "@/features/audit/components/AuditLogTable";

export const metadata: Metadata = {
  title: "Journal d’audit",
};

export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journal d’audit"
        description="Trace de toutes les actions sensibles, tous tenants confondus. Lecture seule."
      />
      <RequirePermission permission="audit.view">
        <AuditLogTable />
      </RequirePermission>
    </div>
  );
}
