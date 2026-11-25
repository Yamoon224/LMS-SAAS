import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { CERTIFICATE_STATUS_LABELS } from "@/features/certificates/schemas/certificate.schema";
import type { CertificateStatus } from "@/features/certificates/schemas/certificate.schema";

const STATUS_VARIANTS: Record<CertificateStatus, BadgeProps["variant"]> = {
  VALID: "success",
  REVOKED: "danger",
  REISSUED: "secondary",
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{CERTIFICATE_STATUS_LABELS[status]}</Badge>;
}
