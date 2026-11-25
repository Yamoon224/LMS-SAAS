import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivateForm } from "@/features/auth/components/ActivateForm";

export const metadata: Metadata = {
  title: "Activation du compte{suffix}",
};

export default function ActivatePage() {
  return (
    <div className="w-full max-w-sm rounded-md border border-border border-b-4 border-b-brand bg-surface p-6 shadow-pop sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-tight">Activez votre compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez un mot de passe pour accéder à votre espace.</p>
      </div>
      <Suspense fallback={null}>
        <ActivateForm />
      </Suspense>
    </div>
  );
}
