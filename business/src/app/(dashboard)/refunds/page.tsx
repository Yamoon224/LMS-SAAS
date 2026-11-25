import type { Metadata } from "next";

import { RefundsPage } from "@/features/refunds/components/RefundsPage";

export const metadata: Metadata = {
  title: "Remboursements",
};

export default function RefundsRoute() {
  return <RefundsPage />;
}
