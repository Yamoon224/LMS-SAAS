"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS } from "./nav-items";
import type { NavItem } from "./nav-items";
import { UserMenu } from "./UserMenu";

import { useSession } from "@/features/session/hooks/useSession";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  collapsed?: boolean;
  /** Appelé au clic sur un lien (ferme le tiroir mobile). */
  onNavigate?: () => void;
}

/** Marque + liste de navigation, partagée entre la barre latérale desktop et le tiroir mobile. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { can, session } = useSession();
  // Tant que la session charge, seules les entrées sans permission sont affichées (pas de scintillement inverse).
  const visible = (item: NavItem) => (item.permission ? Boolean(session) && can(item.permission) : true);
  const groups = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(visible) })).filter(
    (group) => group.items.length > 0,
  );

  return (
    <>
      <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border px-4", collapsed && "justify-center px-2")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="truncate font-display text-sm font-semibold tracking-tight">SaaS LMS · Entreprise</span>
        )}
      </div>

      <nav aria-label="Navigation principale" className={cn("flex-1 overflow-y-auto overflow-x-hidden p-3", collapsed ? "space-y-2 px-2" : "space-y-5")}>
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="space-y-1">
            {collapsed && index > 0 && <hr aria-hidden="true" className="mx-3 mb-2 border-border" />}
            {group.label && !collapsed && (
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-9",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-brand/15 font-semibold text-brand"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <UserMenu variant="sidebar" collapsed={collapsed} />
      </div>
    </>
  );
}

/** Barre latérale desktop (≥ lg), repliable en rail d'icônes. */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      id="sidebar-nav"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
