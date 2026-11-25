"use client";

import { Bell, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserMenu } from "./UserMenu";

import { Button } from "@/components/ui/button";
import { useAdminAlerts } from "@/features/analytics/hooks/useAdminAlerts";
import { usePermissions, useSession } from "@/features/session/hooks/useSession";

interface TopbarProps {
  collapsed: boolean;
  onOpenMenu: () => void;
  onToggleCollapsed: () => void;
}

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("admin-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : le thème reste valable pour la session en cours
    }
  }

  return { dark, toggle };
}

/** Libellé accessible de la pastille d'alertes (pur, testable). */
export function alertsBellLabel(criticalCount: number): string {
  if (criticalCount <= 0) return "Alertes : aucune alerte critique";
  return `Alertes : ${criticalCount} alerte${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""}, ouvrir le tableau de bord`;
}

/**
 * Pastille d'alertes critiques (ADM-03) : lien vers le tableau de bord, rafraîchie chaque minute (hook partagé avec
 * le widget). Discrète à 0 (cloche seule) ; invisible sans la permission `analytics.view` ou en cas d'erreur.
 */
function AlertsBell() {
  const { can } = usePermissions();
  const { data } = useAdminAlerts(can("analytics.view"));
  if (!can("analytics.view") || !data) return null;
  const count = data.criticalCount;

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/" aria-label={alertsBellLabel(count)} title={alertsBellLabel(count)}>
        <Bell className={count > 0 ? "h-4 w-4 text-danger" : "h-4 w-4 text-muted-foreground"} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

/** Barre supérieure collante : hamburger (mobile/tablette), repli (desktop), thème, déconnexion. */
export function Topbar({ collapsed, onOpenMenu, onToggleCollapsed }: TopbarProps) {
  const { dark, toggle } = useTheme();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Ouvrir le menu de navigation">
        <Menu className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Déplier le menu latéral" : "Replier le menu latéral"}
        aria-expanded={!collapsed}
        aria-controls="sidebar"
        title={(collapsed ? "Déplier le menu" : "Replier le menu") + " (Ctrl+B)"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      <div className="ml-auto flex items-center gap-1">
        {session && session.roles.length > 0 && (
          <span className="mr-2 hidden max-w-[16rem] truncate text-xs text-muted-foreground md:inline" title={session.roles.join(", ")}>
            {session.roles.join(", ")}
          </span>
        )}
        <AlertsBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <UserMenu variant="topbar" />
      </div>
    </header>
  );
}
