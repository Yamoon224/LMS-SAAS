import { Badge } from "@/components/ui/badge";
import type { TenantStatus } from "@/features/tenants/schemas/tenant.schema";

const STATUS_CONFIG: Record<TenantStatus, { label: string; variant: "success" | "warning" | "secondary" | "danger" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "success" },
  SUSPENDED: { label: "Suspendue", variant: "danger" },
  ARCHIVED: { label: "Archivée", variant: "secondary" },
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
