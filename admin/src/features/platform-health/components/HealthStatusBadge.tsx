import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { HEALTH_STATUS_LABELS } from "@/features/platform-health/schemas/platform-health.schema";
import type { HealthStatus } from "@/features/platform-health/schemas/platform-health.schema";

const VARIANTS: Record<HealthStatus, BadgeProps["variant"]> = {
  HEALTHY: "success",
  DEGRADED: "warning",
  DOWN: "danger",
  NO_DATA: "secondary",
};

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return <Badge variant={VARIANTS[status]}>{HEALTH_STATUS_LABELS[status]}</Badge>;
}
