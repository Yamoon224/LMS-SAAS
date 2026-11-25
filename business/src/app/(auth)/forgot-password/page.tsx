import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Back-office Entreprise",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm rounded-md border border-border border-b-4 border-b-brand bg-surface p-6 shadow-pop sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-muted-foreground">Indiquez votre e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
