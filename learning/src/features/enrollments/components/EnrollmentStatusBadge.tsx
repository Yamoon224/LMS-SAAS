"use client";

import { Badge } from "@/components/ui/badge";
import { useCopy } from "@/lib/i18n/client";

type Variant = "default" | "neutral" | "success" | "warning" | "danger" | "info";

const VARIANTS: Record<string, Variant> = {
  PENDING_PAYMENT: "warning",
  PENDING_VALIDATION: "info",
  ACTIVE: "default",
  COMPLETED: "success",
  EXPIRED: "neutral",
  SUSPENDED: "warning",
  REFUSED: "danger",
};

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const copy = useCopy();
  return <Badge variant={VARIANTS[status] ?? "neutral"}>{copy.status[status] ?? status}</Badge>;
}
