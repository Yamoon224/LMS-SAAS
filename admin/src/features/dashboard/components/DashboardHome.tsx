"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { NAV_GROUPS } from "@/components/layout/nav-items";
import { Card } from "@/components/ui/card";
import { AdminAlertsWidget } from "@/features/analytics/components/AdminAlertsWidget";
import { DashboardKpis } from "@/features/analytics/components/DashboardKpis";
import { PlatformTrendsSection } from "@/features/analytics/components/PlatformTrendsSection";
import { usePermissions } from "@/features/session/hooks/useSession";

const DESCRIPTIONS: Record<string, string> = {
  "/tenants": "Création, activation, suspension et fiche de chaque entreprise cliente.",
  "/plans": "Plans, quotas, règles de commission et packs de crédits IA.",
  "/admin-users": "Comptes plateforme, invitations et rôles.",
  "/payments": "Fournisseurs de paiement et remboursements.",
  "/wallets": "Soldes des entreprises et double validation des reversements.",
  "/analytics": "MRR, churn, entreprises actives, commissions.",
  "/audit-log": "Trace de toutes les actions sensibles, tous tenants confondus.",
};

/** Accueil : KPI du mois (si analytics.view) et raccourcis vers les sections autorisées. */
export function DashboardHome() {
  const { can, isLoading: isLoadingSession } = usePermissions();
  const canViewAnalytics = can("analytics.view");

  const shortcuts = NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => item.href !== "/" && item.permission && can(item.permission),
  );

  return (
    <div className="flex flex-col gap-6">
      {canViewAnalytics && <DashboardKpis />}

      {canViewAnalytics && <PlatformTrendsSection />}

      {canViewAnalytics && <AdminAlertsWidget />}

      <section aria-labelledby="shortcuts-title" className="flex flex-col gap-3">
        <h2 id="shortcuts-title" className="text-lg font-semibold">
          Accès rapides
        </h2>
        {!isLoadingSession && shortcuts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune section n’est disponible avec votre rôle actuel. Contactez un super administrateur.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group block h-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="flex h-full items-start gap-3 p-4 transition-colors group-hover:border-brand/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-medium">
                        {item.label}
                        <ArrowRight
                          className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{DESCRIPTIONS[item.href]}</p>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
