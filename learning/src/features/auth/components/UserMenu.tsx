"use client";

import { Award, BookOpen, Bell, LogOut, Receipt, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { logout } from "../api/auth.api";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopy } from "@/lib/i18n/client";

/** Menu profil : raccourcis + déconnexion (révocation du refresh token côté serveur). */
export function UserMenu() {
  const copy = useCopy();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/my-learning", label: copy.nav.myLearning, icon: BookOpen },
    { href: "/certificates", label: copy.nav.certificates, icon: Award },
    { href: "/purchases", label: copy.purchases.title, icon: Receipt },
    { href: "/notifications", label: copy.nav.notifications, icon: Bell },
    { href: "/profile", label: copy.profile.title, icon: Settings },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={copy.nav.account}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/15"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {links.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} onSelect={() => router.push(href)}>
            <Icon className="h-4 w-4 text-subtle" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()} className="text-red-700">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {copy.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
