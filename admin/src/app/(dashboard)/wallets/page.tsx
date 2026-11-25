import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { WalletsPage } from "@/features/wallets/components/WalletsPage";

export const metadata: Metadata = {
  title: "Finances & reversements",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finances & reversements"
        description="Soldes des entreprises et file des reversements à double validation."
      />
      <WalletsPage />
    </div>
  );
}
