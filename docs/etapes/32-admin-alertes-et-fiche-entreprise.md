# Étape 32 — Admin : alertes, KPI manquants, fiche entreprise 360° et archivage

**Date** : 2026-11-19
**Référence cahier des charges** : ADM-03 (alertes), ADM-01 (KPI), ADM-10 (fiche 360°), ADM-08 (archivage).
**Rapport d'écarts** : `docs/RAPPORT-CONFORMITE-CDC.md` section 2 « Admin », points 1 et 4.

Aucune modification du schéma Prisma, aucune nouvelle permission.

## Exigences traitées

1. **Alertes (ADM-03)** : `GET /admin/alerts` agrège dix alertes typées (sévérité, titre, détail, compteur, lien d'action), widget sur le tableau de bord Admin.
2. **KPI du tableau de bord (ADM-01)** : entreprises en essai, entreprises suspendues, ARR, revenus crédits IA, certificats délivrés.
3. **Fiche entreprise 360° (ADM-10)** : page à six onglets (Aperçu, Abonnement, Utilisateurs, Activité & usage, Finances, Journal d'audit) alimentée par quatre routes de lecture.
4. **Archivage (ADM-08)** : `POST /admin/tenants/:id/archive` + confirmation dans la fiche et dans le menu de la liste.

## Backend

### Alertes (`analytics/domain/admin-alerts.ts`)
Domaine pur : l'infrastructure (`admin-alerts.prisma-repository.ts`) ne renvoie que des comptages et agrégats (`count`, `aggregate _min`, `groupBy`), appuyés par les index existants (`[tenantId, status]`, `[receivedAt]`). Les requêtes partent en parallèle. Les seuils sont des constantes exportées en tête du fichier de domaine.

| Type | Source | Sévérité |
| --- | --- | --- |
| `FAILED_PAYMENTS` | paiements `FAILED` des 7 derniers jours | critique à 10, sinon à surveiller |
| `SUBSCRIPTIONS_EXPIRED` | abonnements `EXPIRED` dont la fin de période est dans les 30 derniers jours | critique à 5, sinon à surveiller |
| `SUBSCRIPTIONS_GRACE` | abonnements `GRACE_PERIOD` | à surveiller |
| `SUBSCRIPTIONS_EXPIRING` | `ACTIVE`/`TRIALING` dont la période se termine dans 7 jours | information |
| `PAYOUTS_PENDING` | reversements `REQUESTED` ou `VALIDATED` | critique si le plus ancien a 3 jours ou plus |
| `REFUNDS_PENDING` | remboursements `ACCEPTED` (acceptés par l'entreprise, reste l'exécution Admin) | critique si le plus ancien a 3 jours ou plus |
| `TENANTS_SUSPENDED` | entreprises `SUSPENDED` | information |
| `WEBHOOK_FAILURES` | webhooks `ERROR` / `UNKNOWN_REFERENCE` non résolus, 24 h (même file que le rapprochement) | critique à 10 |
| `AI_CONSUMPTION_ANOMALY` | débits de crédits IA des 24 h : au moins 5 000 crédits **et** au moins 5 fois la moyenne quotidienne des 30 jours précédents (sans historique, le plancher seul) | à surveiller |
| `MEDIA_ANALYSIS_FAILED` | médias `FAILED` / `REJECTED` des 7 derniers jours | critique à 10 |

Une alerte à compteur nul n'est pas émise. Tri : sévérité (critique d'abord) puis compteur décroissant. La réponse porte aussi `criticalCount` (utilisable pour une pastille). Permission : `analytics.view`.

### KPI
`PlatformDashboard` reçoit `trialingTenantsCount` (abonnements `TRIALING`), `suspendedTenantsCount`, `annualRecurringRevenue` (MRR arrondi × 12), `creditRevenue` (paiements `CREDIT_PURCHASE` réussis sur la période), `certificatesIssuedCount` (période). Quatre requêtes de comptage/agrégat ajoutées au `Promise.all` existant.

### Fiche 360° (`AdminTenantOverviewController`, module analytics)
Lecture seule, même précédent que le tableau de bord (lecture Prisma transverse). Une permission par onglet, comme les pages dédiées :

| Route | Permission | Contenu |
| --- | --- | --- |
| `GET /admin/tenants/:id/overview` | `tenants.read` | profil, charte publique (via `TenantsFacade`), propriétaires, abonnement courant et historique (20), usage et quotas |
| `GET /admin/tenants/:id/users` | `tenants.read` | comptes internes (200 au plus), rôles, statut, 2FA, dernière connexion |
| `GET /admin/tenants/:id/finances` | `wallet.view-all` | synthèse (solde comptable, encaissé, reversé, remboursé, échecs) + 20 derniers paiements, reversements, remboursements |
| `GET /admin/tenants/:id/audit` | `audit.view` | 100 dernières entrées du journal de l'entreprise |

Jamais exposés : hash de mot de passe, secret 2FA, coordonnées de reversement (la carte « Compte de reversement » existante, masquée, reste utilisée), charge brute des paiements. L'abonnement « courant » est le plus récent parmi `ACTIVE`, `TRIALING`, `GRACE_PERIOD` ; ses quotas sont comparés à l'usage réel (règle du `PlanQuotaPrismaRepository` : quota absent = illimité).

### Archivage
`ArchiveTenantUseCase` (module tenants) s'appuie sur `Tenant.archive()` déjà présent : ACTIVE ou SUSPENDED vers ARCHIVED, état terminal ; DRAFT et ARCHIVED lèvent `TRANSITION_INVALIDE` (409). Renseigne `archivedAt`, émet `tenant.archived` (acteur inclus), inscrit au journal d'audit par `AuditSensitiveEventsListener`. **Permission : `tenants.suspend`** (aucune permission `tenants.archive` dédiée, pour ne pas imposer de rattrapage des rôles existants). Aucune donnée n'est supprimée.

## Front Admin

- **Tableau de bord** : `AdminAlertsWidget` (chargement, vide « tout est sous contrôle », erreur avec réessai, rafraîchi chaque minute), visible avec `analytics.view`. Lien d'action restreint aux chemins internes (`safeAlertHref`). Cinq tuiles ajoutées à la grille de KPI (donc aussi sur la page Analytique).
- **Fiche entreprise** : `TenantDetail` en onglets (barre défilante sur mobile). Aperçu, Abonnement et Activité & usage partagent une seule requête `overview` ; Utilisateurs, Finances et Audit ne chargent qu'à l'ouverture de l'onglet. Les onglets Finances et Audit sont masqués sans la permission ; un 403 affiche l'état « accès refusé ». Quotas en jauges (orange dès 80 %, rouge à 100 %). Actions d'activation, de suspension et d'attribution de plan inchangées ; bouton **Archiver** avec confirmation destructive.
- La liste des entreprises gagne l'action « Archiver ».

## Limites connues

- **Pastille d'alertes dans la barre supérieure non faite** : `components/layout/*` était exclu de cette étape. `criticalCount` est déjà fourni par l'API pour le brancher.
- **Onglet Utilisateurs en lecture seule** : le backend n'expose aucune action Admin sur les comptes d'une entreprise (ADM-06 reste ouvert). Les apprenants ne sont que comptés.
- Les listes de la fiche sont tronquées (20 / 100 / 200 lignes), sans pagination.
- Le solde de l'onglet Finances est comptable (écritures du compte entreprise) ; il peut différer du solde disponible au reversement (rétention).
- Les alertes d'anomalie IA se basent sur le grand livre de crédits : sans débit, aucune alerte. Les certificats n'ont pas d'analyse antivirus : seule l'analyse des médias est surveillée.
- Archiver ne bloque pas une entreprise ayant un abonnement actif ou un solde non reversé (à valider).
- Le composant `TenantSubscriptionSummary` n'est plus utilisé par la fiche (remplacé par l'onglet Abonnement) ; laissé en place.

## Vérification

- Backend : `tsc` sans erreur dans les modules touchés (des erreurs préexistantes d'autres lots, client Prisma non régénéré, subsistent) ; Jest ciblé : alertes (seuils, sévérités, tri, anomalies IA), quotas, archivage.
- Admin : Vitest ciblé OK (schémas d'alertes et de fiche, seuils de quotas), ESLint sur les dossiers touchés.
- **Non testé** : exécution des requêtes sur une vraie base, affichage dans le navigateur, test unitaire des composants React (l'infrastructure Vitest est en environnement `node`, `*.test.ts` uniquement : la logique testable a été extraite dans les schémas).
