"use client";

import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { UserMenu } from "./UserMenu";

import { Button } from "@/components/ui/button";

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
      localStorage.setItem("business-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : le thème reste valable pour la session en cours
    }
  }

  return { dark, toggle };
}

/** Barre supérieure collante : hamburger (mobile/tablette), repli (desktop), thème, déconnexion. */
export function Topbar({ collapsed, onOpenMenu, onToggleCollapsed }: TopbarProps) {
  const { dark, toggle } = useTheme();

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
        aria-expanded={!collapsed}
        aria-controls="sidebar-nav"
        aria-label={collapsed ? "Déplier le menu latéral" : "Replier le menu latéral"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      <div className="ml-auto flex items-center gap-1">
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
