import type { Metadata } from "next";

import { AiTranslationPage } from "@/features/ai-translation/components/AiTranslationPage";

export const metadata: Metadata = {
  title: "Traduction IA",
};

export default function AiTranslationRoute() {
  return <AiTranslationPage />;
}
