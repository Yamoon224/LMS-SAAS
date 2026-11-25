import {
  Award,
  Banknote,
  BookOpen,
  Bot,
  Building2,
  CreditCard,
  FileClock,
  Activity,
  GraduationCap,
  Scale,
  Languages,
  Plug,
  LayoutDashboard,
  Mail,
  LineChart,
  Receipt,
  Undo2,
  SlidersHorizontal,
  GitCompare,
  ShieldCheck,
  Lock,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission plateforme requise pour afficher l'entrée (absente : toujours visible). */
  permission?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Navigation du back-office Admin ; les entrées sont filtrées par les permissions du JWT (UX seulement). */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/security", label: "Sécurité du compte", icon: Lock },
    ],
  },
  {
    label: "Plateforme",
    items: [
      { href: "/tenants", label: "Entreprises", icon: Building2, permission: "tenants.read" },
      { href: "/plans", label: "Plans & tarification", icon: Banknote, permission: "plans.manage" },
      { href: "/admin-users", label: "Comptes administrateurs", icon: ShieldCheck, permission: "admin-users.manage" },
      { href: "/languages", label: "Langues", icon: Languages, permission: "languages.manage" },
      { href: "/integrations", label: "Intégrations", icon: Plug, permission: "integrations.manage" },
      { href: "/certificate-library", label: "Modèles de certificats", icon: Award, permission: "certificate-library.manage" },
      { href: "/legal", label: "Pages légales", icon: Scale, permission: "legal.manage" },
      { href: "/notification-templates", label: "Modèles d'e-mails", icon: Mail, permission: "notification-templates.manage" },
    ],
  },
  {
    label: "Finances",
    items: [
      { href: "/payments", label: "Paiements", icon: CreditCard, permission: "payments.manage-providers" },
      { href: "/refunds", label: "Remboursements", icon: Undo2, permission: "payments.refund" },
      { href: "/wallets", label: "Finances & reversements", icon: Wallet, permission: "wallet.view-all" },
      { href: "/finance-settings", label: "Paramètres financiers", icon: SlidersHorizontal, permission: "finance-settings.manage" },
      { href: "/reconciliation", label: "Rapprochement", icon: GitCompare, permission: "payments.reconcile" },
    ],
  },
  {
    label: "Supervision",
    items: [
      { href: "/courses", label: "Formations", icon: BookOpen, permission: "analytics.view" },
      { href: "/learners", label: "Apprenants", icon: GraduationCap, permission: "analytics.view" },
      { href: "/certificates", label: "Certificats", icon: Award, permission: "analytics.view" },
      { href: "/transactions", label: "Transactions", icon: Receipt, permission: "wallet.view-all" },
    ],
  },
  {
    label: "Suivi",
    items: [
      { href: "/analytics", label: "Analytique", icon: LineChart, permission: "analytics.view" },
      { href: "/ai-consumption", label: "Consommation IA", icon: Bot, permission: "analytics.view" },
      { href: "/health", label: "Santé technique", icon: Activity, permission: "analytics.view" },
      { href: "/audit-log", label: "Journal d'audit", icon: FileClock, permission: "audit.view" },
    ],
  },
];
