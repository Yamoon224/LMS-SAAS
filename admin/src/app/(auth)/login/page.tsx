import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-md border border-border border-b-4 border-b-brand bg-surface p-6 shadow-pop sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-tight">Back-office Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez-vous avec votre compte administrateur plateforme.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
