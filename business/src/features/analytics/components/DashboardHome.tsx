"use client";

import { ArrowRight, BarChart3, BookPlus, Radio, Wallet } from "lucide-react";
import Link from "next/link";

import { useBusinessDashboard } from "../hooks/useBusinessDashboard";
import { rangeForPreset } from "../schemas/analytics.schema";

import { KpiGrid } from "./KpiGrid";
import { TopCourses } from "./TopCourses";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/features/session/hooks/useSession";
import { ApiError } from "@/lib/api-client";

const QUICK_LINKS = [
  {
    href: "/courses/new",
    title: "Créer une formation",
    description: "Démarrez un nouveau parcours en brouillon.",
    icon: BookPlus,
    permission: "courses.manage",
  },
  {
    href: "/live-sessions",
    title: "Planifier une session live",
    description: "Programmez un Google Meet pour vos apprenants.",
    icon: Radio,
    permission: "live-sessions.manage",
  },
  {
    href: "/learners",
    title: "Paiements hors plateforme",
    description: "Choisissez une formation pour valider les paiements en attente.",
    icon: Wallet,
    permission: "offline-payments.validate",
  },
] as const;

/** Accueil : KPI du mois (analytics) + raccourcis vers les tâches courantes. */
export function DashboardHome() {
  const { can } = useSession();
  const mayViewAnalytics = can("analytics.view");
  const { data, isLoading, error } = useBusinessDashboard(rangeForPreset("month"), mayViewAnalytics);
  const unavailable = !mayViewAnalytics
    ? new ApiError(403, "")
    : error instanceof ApiError && (error.status === 403 || error.status >= 500)
      ? error
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de l’activité de votre entreprise ce mois-ci."
      />

      <section aria-label="Raccourcis" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {QUICK_LINKS.filter((link) => can(link.permission)).map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex h-full items-start gap-3 p-4 transition-colors group-hover:border-brand/40 group-hover:bg-accent/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{link.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{link.description}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Card>
            </Link>
          );
        })}
      </section>

      {unavailable ? (
        <Card className="flex items-start gap-3 p-4 text-sm text-muted-foreground" role="status">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {unavailable.status === 403
              ? "Les indicateurs ne sont pas disponibles pour votre rôle (droit « analytics.view » requis)."
              : "Les indicateurs sont momentanément indisponibles."}
          </p>
        </Card>
      ) : (
        <>
          <section aria-label="Indicateurs du mois" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Ce mois-ci</h2>
              <Link href="/analytics" className="text-sm text-brand hover:underline">
                Voir l’analytique
              </Link>
            </div>
            <KpiGrid data={data} isLoading={isLoading} compact />
          </section>
          <TopCourses courses={data?.topCourses} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
