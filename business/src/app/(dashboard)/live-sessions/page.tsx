import type { Metadata } from "next";

import { LiveSessionsPage } from "@/features/live-sessions/components/LiveSessionsPage";

export const metadata: Metadata = {
  title: "Sessions live",
};

export default function LiveSessionsRoute() {
  return <LiveSessionsPage />;
}
