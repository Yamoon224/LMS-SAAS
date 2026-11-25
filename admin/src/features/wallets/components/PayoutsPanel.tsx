"use client";

import { PayoutStatusQueue } from "./PayoutStatusQueue";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAYOUT_STATUS_LABELS } from "@/features/wallets/schemas/wallet.schema";
import type { PayoutStatus } from "@/features/wallets/schemas/wallet.schema";

const QUEUE_STATUSES: PayoutStatus[] = ["REQUESTED", "VALIDATED", "APPROVED", "EXECUTED", "REJECTED"];

export function PayoutsPanel() {
  return (
    <Tabs defaultValue="REQUESTED">
      <TabsList>
        {QUEUE_STATUSES.map((status) => (
          <TabsTrigger key={status} value={status}>
            {PAYOUT_STATUS_LABELS[status]}
          </TabsTrigger>
        ))}
      </TabsList>

      {QUEUE_STATUSES.map((status) => (
        <TabsContent key={status} value={status}>
          <PayoutStatusQueue status={status} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
