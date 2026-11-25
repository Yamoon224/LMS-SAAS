"use client";

import { CreditsPanel } from "./CreditsPanel";
import { TranslationPanel } from "./TranslationPanel";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Traduction IA & crédits (ENT-06, ADM-18). */
export function AiTranslationPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Traduction IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traduisez vos formations avec des crédits IA et suivez votre solde.
        </p>
      </div>

      <Tabs defaultValue="translate">
        <TabsList>
          <TabsTrigger value="translate">Traduire</TabsTrigger>
          <TabsTrigger value="credits">Crédits</TabsTrigger>
        </TabsList>
        <TabsContent value="translate">
          <TranslationPanel />
        </TabsContent>
        <TabsContent value="credits">
          <CreditsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
