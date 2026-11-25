# Étape 05 — Demandes de remboursement

**Date** : 2026-11-17
**Référence cahier des charges** : ENT-70 (examen des demandes : acceptation ou refus motivé, suivi par l'Admin), section 9.5 (politique), ADM-26.

## Parcours

1. **Apprenant** (`learning`) : sur la page d'une formation payante, « Demander un remboursement » (motif facultatif).
2. **Entreprise** (`business`, page `/refunds`) : accepte, ou refuse avec un **motif obligatoire**. Un indicateur signale les demandes faites dans les 7 jours suivant l'achat (remboursement intégral recommandé).
3. **Admin** (`admin`, page `/refunds`) : file « À rembourser » ; « Rembourser » appelle le fournisseur de paiement d'origine (cas d'usage existant `RefundPaymentUseCase`), qui déclenche déjà l'écriture de remboursement au grand livre.

Statuts : `REQUESTED → ACCEPTED → REFUNDED`, ou `REQUESTED → REJECTED`. Une demande refusée peut être redéposée ; une demande acceptée ou remboursée bloque toute nouvelle demande sur le même paiement.

## Backend (`backend/src/modules/payments/`)

| Fichier | Rôle |
| --- | --- |
| `domain/refund-request.ts` | Statuts, `applyRefundDecision` (transitions, motif de refus obligatoire), `isWithinAutomaticWindow` (7 jours), erreurs typées. |
| `domain/refund-request.repository.port.ts`, `infrastructure/refund-request.prisma-repository.ts` | Persistance sur la table `Refund` existante. |
| `application/refund-requests.use-cases.ts` | Demander, décider, lister, exécuter. |
| `presentation/public-refunds.controller.ts` | `POST /public/refunds` (permission `learner.request-refund`). |
| `presentation/business-refunds.controller.ts` | `GET /business/refunds`, `POST …/:id/accept`, `POST …/:id/reject` (`refunds.manage`). |
| `presentation/admin-refunds.controller.ts` | `GET /admin/refunds?status=`, `POST …/:id/execute` (`payments.refund`). |

Garanties : l'apprenant ne peut demander que sur **sa propre** inscription, payée en ligne et encaissée ; une entreprise ne peut décider que sur **ses** demandes (une demande d'une autre entreprise renvoie 404) ; l'exécution vérifie la transition **avant** d'appeler le fournisseur.

### Changements de modèle et de permissions

- `prisma/schema.prisma` : nouvelle colonne nullable `Refund.decisionNote` (motif de refus). Le projet n'a pas de dossier de migrations : appliquer avec `pnpm --filter backend exec prisma db push` (ou votre procédure habituelle), puis `db:generate`.
- Nouvelles permissions : `learner.request-refund` (rôle Apprenant), `refunds.manage` (Propriétaire et Gestionnaire). Les entreprises **déjà créées** doivent recevoir ces permissions via `pnpm db:backfill-roles` (comme pour les autres codes de permission).

## Fronts (chacun autonome, aucun fichier partagé)

- `business/features/refunds/` : page, tableau, actions, boîte de dialogue de refus ; entrée de navigation « Remboursements ».
- `admin/features/refunds/` : filtre par statut, tableau, confirmation avant remboursement ; entrée « Remboursements » (permission `payments.refund`).
- `learning/features/refunds/` : section « Un souci avec cet achat ? » (textes propres à la feature) intégrée au hub d'inscription.

## Limites connues

- Remboursement **intégral** uniquement (montant = paiement) ; pas de remboursement partiel ni de prorata (formation devenue inaccessible).
- L'éligibilité automatique (progression < 20 %, aucun quiz/examen) n'est pas calculée : l'entreprise décide, avec l'indicateur des 7 jours.
- L'apprenant ne voit pas encore le statut ni le motif de refus de sa demande, et aucune notification n'est envoyée (étapes à venir).
- Si le fournisseur n'a pas d'API de remboursement, l'exécution échoue avec `REMBOURSEMENT_NON_SUPPORTE` : le remboursement manuel n'est pas encore tracé dans l'outil.

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 69 suites / 439 tests OK (nouveaux : transitions, motif obligatoire, fenêtre de 7 jours ; le test de couverture des permissions a aussi validé les nouveaux codes).
- Admin : `tsc`, ESLint OK, 30 tests OK. Business : `tsc`, ESLint OK, 27 tests OK. Learning : `tsc`, ESLint OK (pas de tests).
- Non testé de bout en bout (base de données, fournisseur de paiement, navigateur).
