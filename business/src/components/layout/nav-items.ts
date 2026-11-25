import {
  Award,
  BarChart3,
  Banknote,
  CreditCard,
  BookOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  Lock,
  Radio,
  Settings,
  Undo2,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission backend requise (masquage UX uniquement, le backend reste l'autorité). */
  permission?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Portée de la navigation entreprise (commentaires ENT-xx du backend) : Formations ENT-15-25,
 * Évaluations ENT-27-36, Certificats ENT-38-46, Apprenants ENT-60-64, Portefeuille ENT-11,
 * Utilisateurs & rôles ENT-10, Crédits IA ENT-06, Sessions live ENT-52-58, Analytique, Audit.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/security", label: "Sécurité du compte", icon: Lock },
    ],
  },
  {
    label: "Formation",
    items: [
      { href: "/courses", label: "Formations", icon: BookOpen, permission: "courses.manage" },
      { href: "/learners", label: "Apprenants", icon: GraduationCap, permission: "learners.view" },
      { href: "/live-sessions", label: "Sessions live", icon: Radio, permission: "live-sessions.manage" },
      { href: "/certificates", label: "Certificats", icon: Award, permission: "certificates.manage" },
      { href: "/ai-translation", label: "Traduction IA", icon: Sparkles, permission: "courses.manage" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/wallet", label: "Paiements / Portefeuille", icon: Banknote, permission: "wallet.view" },
      { href: "/subscription", label: "Abonnement", icon: CreditCard, permission: "subscriptions.manage" },
      { href: "/refunds", label: "Remboursements", icon: Undo2, permission: "refunds.manage" },
      { href: "/analytics", label: "Analytique", icon: BarChart3, permission: "analytics.view" },
      { href: "/users", label: "Utilisateurs & rôles", icon: Users, permission: "business-users.manage" },
      { href: "/audit", label: "Journal d'activité", icon: History, permission: "audit.view" },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

/**
 * Permission requise par route (le plus spécifique en premier). Sert à afficher « accès non
 * autorisé » au lieu d'une bannière 403 brute — UX uniquement, le backend revalide chaque appel.
 */
const ROUTE_PERMISSIONS: { test: (pathname: string) => boolean; permission: string }[] = [
  { test: (p) => /^\/courses\/[^/]+\/learners/.test(p), permission: "learners.view" },
  { test: (p) => /^\/courses\/[^/]+\/report/.test(p), permission: "analytics.view" },
  { test: (p) => p.startsWith("/courses"), permission: "courses.manage" },
  ...NAV_GROUPS.flatMap((group) => group.items)
    .filter((item) => item.permission && item.href !== "/courses")
    .map((item) => ({ test: (p: string) => p.startsWith(item.href), permission: item.permission as string })),
];

export function requiredPermissionFor(pathname: string): string | undefined {
  return ROUTE_PERMISSIONS.find((route) => route.test(pathname))?.permission;
}
