"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { requiredPermissionFor } from "./nav-items";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";


import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Forbidden } from "@/features/session/components/Forbidden";
import { useSession } from "@/features/session/hooks/useSession";

const COLLAPSE_KEY = "business-sidebar-collapsed";

/**
 * Coque responsive : barre latérale repliable (≥ lg), tiroir (Radix Dialog) en dessous,
 * topbar collante, contenu centré (max-w-7xl) avec marges fluides. Aucun défilement horizontal
 * de page : `min-w-0` sur la colonne de contenu pour que les tableaux défilent dans leur conteneur.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, isLoading: sessionLoading } = useSession();
  const required = requiredPermissionFor(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // stockage indisponible : état par défaut
    }
  }, []);

  // Ferme le tiroir à chaque navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignoré
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        Aller au contenu
      </a>

      <Sidebar collapsed={collapsed} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent aria-describedby="drawer-desc">
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <SheetDescription id="drawer-desc" className="sr-only">
            Accès aux sections du back-office entreprise.
          </SheetDescription>
          <SheetClose className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Fermer le menu</span>
          </SheetClose>
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Topbar
          collapsed={collapsed}
          onOpenMenu={() => setDrawerOpen(true)}
          onToggleCollapsed={toggleCollapsed}
        />
        <main id="contenu" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {required && sessionLoading ? <Skeleton className="h-40 w-full" /> : can(required) ? children : <Forbidden />}
        </main>
      </div>
    </div>
  );
}
