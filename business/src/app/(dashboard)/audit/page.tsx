import type { Metadata } from "next";

import { AuditPage } from "@/features/audit/components/AuditPage";

export const metadata: Metadata = {
  title: "Journal d’activité",
};

export default function AuditRoute() {
  return <AuditPage />;
}
