import type { Metadata } from "next";

import { DashboardHome } from "@/features/analytics/components/DashboardHome";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default function DashboardHomePage() {
  return <DashboardHome />;
}
