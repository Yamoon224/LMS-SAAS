/**
 * Rôle plateforme par défaut (section 2) : le Super Administrateur reçoit toutes les
 * permissions exigées par les contrôleurs `admin/*` (audit des `@RequirePermissions`).
 *
 *   tenants.create/read/update/suspend/activate -> admin/tenants
 *   payout-accounts.verify            -> admin/tenants/:id/payout-account/verify (vérification des coordonnées de reversement, ENT-11)
 *   plans.manage                      -> admin/plans
 *   subscriptions.assign              -> admin/tenants/:id/subscription
 *   admin-users.manage                -> admin/users
 *   payments.manage-providers/refund  -> admin/payments
 *   notification-templates.manage     -> admin/notification-templates (modèles d'e-mails, ADM-38)
 *   languages.manage                  -> admin/languages (langues de la plateforme, ADM-40)
 *   certificate-library.manage        -> admin/certificate-library (bibliothèque de modèles de certificats, ADM-39)
 *   integrations.manage               -> admin/integrations (fournisseurs externes, secrets chiffrés, ADM-37)
 *   finance-settings.manage           -> admin/finance-settings (rétention, seuil, fréquence de reversement, frais — ADM-21/23)
 *   payments.reconcile                -> admin/reconciliation (paiements en attente, webhooks en échec, doublons — ADM-27)
 *   legal.manage                      -> admin/legal (CGU, CGV, confidentialité, ADM-41)
 *   payouts.approve/validate/execute  -> admin/wallets (reversements)
 *   wallet.view-all                   -> admin/wallets (lecture)
 *   analytics.view / audit.view       -> admin/analytics, admin/audit
 */
export const PLATFORM_SUPER_ADMIN_ROLE_NAME = "Super Administrateur";

export const PLATFORM_SUPER_ADMIN_PERMISSION_CODES: readonly string[] = [
  "tenants.create",
  "tenants.read",
  "tenants.update",
  "tenants.suspend",
  "tenants.activate",
  "payout-accounts.verify",
  "plans.manage",
  "subscriptions.assign",
  "admin-users.manage",
  "payments.manage-providers",
  "payments.refund",
  "legal.manage",
  "finance-settings.manage",
  "payments.reconcile",
  "notification-templates.manage",
  "languages.manage",
  "integrations.manage",
  "certificate-library.manage",
  "payouts.approve",
  "payouts.validate",
  "payouts.execute",
  "wallet.view-all",
  "analytics.view",
  "audit.view",
];
