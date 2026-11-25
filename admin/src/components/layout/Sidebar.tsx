"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NAV_GROUPS } from "./nav-items";
import { UserMenu } from "./UserMenu";

import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  collapsed?: boolean;
  /** Appelé au clic sur un lien (ferme le tiroir mobile). */
  onNavigate?: () => void;
}

type NavEntry = (typeof NAV_GROUPS)[number]["items"][number];

/** Lien de navigation ; en mode rail, infobulle (position fixe pour échapper au overflow du nav). */
function NavLink({ item, isActive, collapsed, onNavigate }: { item: NavEntry; isActive: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const [tip, setTip] = useState<number | null>(null);
  const Icon = item.icon;
  const show = (el: HTMLElement) => {
    if (collapsed) {
      const rect = el.getBoundingClientRect();
      setTip(rect.top + rect.height / 2);
    }
  };
  return (
    <>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setTip(null)}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-9",
          collapsed && "justify-center px-0",
          isActive ? "bg-brand/15 font-semibold text-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
      {collapsed && tip !== null && (
        <span
          role="tooltip"
          style={{ top: tip, left: 72 }}
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-md"
        >
          {item.label}
        </span>
      )}
    </>
  );
}

/** Marque + liste de navigation, partagée entre la barre latérale desktop et le tiroir mobile. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { can, isLoading } = usePermissions();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border px-4", collapsed && "justify-center px-2")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-brand-foreground shadow-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="truncate font-display text-sm font-semibold tracking-tight">SaaS LMS · Admin</span>
        )}
      </div>

      <nav aria-label="Navigation principale" className={cn("flex-1 overflow-y-auto p-3", collapsed ? "space-y-3" : "space-y-5")}>
        {isLoading && (
          <div className="space-y-2 px-1" role="status" aria-label="Chargement du menu">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        )}
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="space-y-1">
            {group.label && !collapsed && (
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            {collapsed && index > 0 && <hr className="mx-3 mb-2 border-border" />}
            {group.items.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} isActive={isActive} collapsed={collapsed} onNavigate={onNavigate} />;
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
export function Sidebar({ collapsed, animate = true }: { collapsed: boolean; animate?: boolean }) {
  return (
    <aside
      id="sidebar"
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface lg:flex",
        animate && "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
