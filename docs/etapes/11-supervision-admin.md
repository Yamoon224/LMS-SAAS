# Étape 11 — Supervision globale de l'Admin

**Date** : 2026-11-17
**Référence cahier des charges** : section 5.5 — ADM-29 (formations), ADM-30 (apprenants), ADM-31 (certificats), ADM-32 (transactions). Lecture seule.

## Backend (`backend/src/modules/analytics/`)

| Fichier | Rôle |
| --- | --- |
| `domain/supervision.ts` | Types des quatre listes, plafond de 500 lignes, `mergeLocales` (langue source d'abord, sans doublon). |
| `domain/supervision.repository.port.ts`, `infrastructure/supervision.prisma-repository.ts` | Lectures Prisma (même précédent documenté que le tableau de bord : agrégations transverses sans façade). Aucune écriture. |
| `presentation/admin-supervision.controller.ts` + DTO | `GET /admin/supervision/{courses,learners,certificates,transactions}`, filtre optionnel `?tenantId=`. |

**Permissions** : formations, apprenants et certificats exigent `analytics.view` ; transactions exige `wallet.view-all` (donnée financière). Aucune nouvelle permission : pas de rattrapage des comptes existants.

**Données exposées** : jamais de mot de passe, de jeton, ni de charge brute de fournisseur. Les paiements montrent la référence fournisseur (utile au rapprochement), les apprenants leur nom et e-mail (ADM-30).

## Front Admin (`admin/features/supervision/`)

Quatre pages (`/courses`, `/learners`, `/certificates`, `/transactions`) dans un groupe de navigation « Supervision » : tableau avec recherche, tri, export, état vide, et filtre par entreprise commun. Le filtre « apprenants » et la recherche par numéro de certificat couvrent le critère « recherche par numéro, statut ».

## Limites connues

- Chaque liste renvoie les **500 lignes les plus récentes** ; recherche et tri portent sur ces lignes. Une pagination côté serveur et une recherche serveur seront nécessaires quand les volumes dépasseront ce plafond.
- Pas de filtre par date ni par statut côté serveur (recherche texte côté écran seulement).
- ADM-30 prévoit la « consultation de la fiche » d'un apprenant : seule la liste existe.
- Pas d'action depuis ces listes (révocation d'un certificat, suspension d'un apprenant) : elles restent côté entreprise.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, 76 suites / 484 tests OK (nouveau : fusion des langues). Les requêtes Prisma ne sont pas couvertes par un test automatisé.
- Admin : `tsc`, ESLint OK, 30 tests OK.
- **Non testé** : exécution des requêtes sur une vraie base, affichage dans le navigateur.
