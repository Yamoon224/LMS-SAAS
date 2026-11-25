import type { Metadata } from "next";

import { CertificatesPage } from "@/features/certificates/components/CertificatesPage";

export const metadata: Metadata = {
  title: "Certificats",
};

export default function CertificatesRoute() {
  return <CertificatesPage />;
}
