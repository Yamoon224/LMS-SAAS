import type { Metadata } from "next";

import { AnalyticsPage } from "@/features/analytics/components/AnalyticsPage";

export const metadata: Metadata = {
  title: "Analytique",
};

export default function AnalyticsRoute() {
  return <AnalyticsPage />;
}
