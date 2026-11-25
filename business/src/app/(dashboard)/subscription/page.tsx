import type { Metadata } from "next";

import { SubscriptionPage } from "@/features/subscription/components/SubscriptionPage";

export const metadata: Metadata = {
  title: "Abonnement",
};

export default function SubscriptionRoute() {
  return <SubscriptionPage />;
}
