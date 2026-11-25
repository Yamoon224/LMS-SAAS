/**
 * Rôles entreprise par défaut et leurs permissions (section 2 "Acteurs et rôles").
 * Créés automatiquement à la création de chaque tenant (ADM-04/ADM-05) et
 * complétés pour les tenants existants par `pnpm db:backfill-roles`.
 * Les permissions sont configurables ensuite ; ceci est le jeu de départ.
 *
 * Audit des codes de permission (`@RequirePermissions`) côté entreprise :
 *   courses.manage           -> cours, modules, leçons, quiz, examen, médias, traduction IA, liste des formateurs
 *   learners.view            -> lecture des inscrits d'une formation (liste, fiche)
 *   learners.manage          -> suspendre/réactiver, prolonger l'accès, réinitialiser la progression, inviter un apprenant
 *   offline-payments.validate-> validation des paiements hors plateforme
 *   certificates.manage      -> certificats (émission, révocation, modèles)
 *   live-sessions.manage     -> sessions live
 *   analytics.view           -> tableaux de bord entreprise
 *   audit.view               -> journal d'audit entreprise
 *   refunds.manage           -> demandes de remboursement des apprenants (ENT-70)
 *   wallet.view              -> solde / écritures du portefeuille
 *   wallet.request-payout    -> demande de reversement
 *   business-users.manage    -> utilisateurs internes (invitation, rôles, désactivation)
 *   settings.manage          -> paramètres de l'entreprise : identité visuelle, contacts, paiement hors plateforme, coordonnées de reversement (ENT-08/11/12)
 *   subscriptions.manage     -> abonnement et facturation de l'entreprise
 *   learner.*                -> routes publiques apprenant (rôle « Apprenant »)
 */
export const TENANT_OWNER_ROLE_NAME = "Propriétaire d'entreprise";
export const TENANT_MANAGER_ROLE_NAME = "Gestionnaire";
export const TENANT_INSTRUCTOR_ROLE_NAME = "Formateur / Concepteur";
export const TENANT_LEARNER_ROLE_NAME = "Apprenant";

export interface DefaultTenantRoleDefinition {
  name: string;
  permissionCodes: string[];
}

/** Permissions des routes publiques apprenant (tous les `@RequirePermissions("learner.*")` des contrôleurs `public/*`). */
export const LEARNER_PERMISSION_CODES: readonly string[] = [
  "learner.enroll",
  "learner.take-lesson",
  "learner.take-assessment",
  "learner.view-own-enrollments",
  "learner.request-refund",
];

export const DEFAULT_TENANT_ROLES: readonly DefaultTenantRoleDefinition[] = [
  {
    name: TENANT_OWNER_ROLE_NAME,
    // Choix par défaut : le Propriétaire reçoit TOUTES les permissions côté back-office
    // (y compris gestion des utilisateurs, abonnement et demande de reversement,
    // réservés à lui seul), mais aucune permission apprenant.
    permissionCodes: [
      "business-users.manage",
      "subscriptions.manage",
      "courses.manage",
      "learners.view",
      "learners.manage",
      "offline-payments.validate",
      "certificates.manage",
      "live-sessions.manage",
      "analytics.view",
      "audit.view",
      "wallet.view",
      "refunds.manage",
      "settings.manage",
      "wallet.request-payout",
      // Codes historiques conservés (réservés, aucune route ne les exige aujourd'hui).
      "payouts.request",
      "tenant-settings.manage",
    ],
  },
  {
    name: TENANT_MANAGER_ROLE_NAME,
    // Choix par défaut : le Gestionnaire pilote l'opérationnel (contenu, apprenants,
    // paiements hors plateforme, certificats, sessions live, statistiques, lecture du
    // portefeuille) mais NI les utilisateurs internes, NI l'abonnement, NI la demande de
    // reversement, NI le journal d'audit (données sensibles, Propriétaire uniquement).
    permissionCodes: [
      "courses.manage",
      "learners.view",
      "learners.manage",
      "offline-payments.validate",
      "certificates.manage",
      "live-sessions.manage",
      "analytics.view",
      "wallet.view",
      "refunds.manage",
      "settings.manage",
    ],
  },
  {
    name: TENANT_INSTRUCTOR_ROLE_NAME,
    // Choix par défaut : le Formateur conçoit (cours, modules, leçons, évaluations,
    // médias, traduction) et anime (sessions live), et peut CONSULTER les inscrits
    // (`learners.view`, lecture seule) sans pouvoir les suspendre, prolonger ou réinitialiser.
    // `courses.manage` est la seule permission granulaire existante pour la création de
    // contenu : il inclut donc aussi publication/suppression (décision produit à valider).
    permissionCodes: [
      "courses.manage",
      "live-sessions.manage",
      "learners.view",
      // Codes historiques conservés (réservés, aucune route ne les exige aujourd'hui).
      "courses.edit-assigned",
      "live-sessions.host",
      "results.view",
    ],
  },
  {
    name: TENANT_LEARNER_ROLE_NAME,
    // Rôle attribué à tout compte apprenant (inscription publique ou invitation) :
    // exactement les permissions exigées par les contrôleurs `public/*`, rien de plus.
    permissionCodes: [...LEARNER_PERMISSION_CODES],
  },
];
