import type { Metadata } from "next";

import { WalletPage } from "@/features/wallet/components/WalletPage";

export const metadata: Metadata = {
  title: "Portefeuille",
};

export default function WalletRoute() {
  return <WalletPage />;
}
