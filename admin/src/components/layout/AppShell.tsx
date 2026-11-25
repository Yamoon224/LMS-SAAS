"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar, SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";


import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

const COLLAPSE_KEY = "admin-sidebar-collapsed";

/**
 * Coque responsive : barre latérale repliable (≥ lg), tiroir (Radix Dialog) en dessous,
 * topbar collante, contenu centré (max-w-7xl) avec marges fluides. Aucun défilement horizontal
 * de page : `min-w-0` sur la colonne de contenu pour que les tableaux défilent dans leur conteneur.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // stockage indisponible : état par défaut
    }
    // Active la transition seulement après l'état initial (évite l'animation au chargement).
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  // Raccourci clavier Ctrl/Cmd + B (desktop).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

      <Sidebar collapsed={collapsed} animate={animate} />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent aria-describedby="drawer-desc">
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <SheetDescription id="drawer-desc" className="sr-only">
            Accès aux sections du back-office Admin.
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
          {children}
        </main>
      </div>
    </div>
  );
}
