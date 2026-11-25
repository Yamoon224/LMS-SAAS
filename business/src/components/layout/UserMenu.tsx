"use client";

import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/api/auth.api";
import { useSession } from "@/features/session/hooks/useSession";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  /** `topbar` : bouton icône ; `sidebar` : pied du menu latéral (menu ouvert vers le haut). */
  variant: "topbar" | "sidebar";
  collapsed?: boolean;
}

/** Menu utilisateur : Profil, Paramètres, Déconnexion. */
export function UserMenu({ variant, collapsed = false }: UserMenuProps) {
  const router = useRouter();
  const { session } = useSession();
  const label = session?.roles[0] ?? "Mon compte";

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const avatar = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
      <UserRound className="h-4 w-4" aria-hidden="true" />
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "topbar" ? (
          <Button variant="ghost" size="icon" aria-label="Menu utilisateur" title={label}>
            {avatar}
          </Button>
        ) : (
          <button
            type="button"
            aria-label="Menu utilisateur"
            title={label}
            className={cn(
              "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "justify-center",
            )}
          >
            {avatar}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === "sidebar" ? "top" : "bottom"}
        align={variant === "sidebar" ? "start" : "end"}
        className="w-56"
      >
        <p className="truncate px-3 py-2 text-xs text-muted-foreground">{label}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden="true" /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" /> Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void handleLogout()}>
          <LogOut aria-hidden="true" /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
