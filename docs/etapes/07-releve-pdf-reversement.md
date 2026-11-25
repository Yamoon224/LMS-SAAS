# Étape 07 — Relevé PDF des reversements

**Date** : 2026-11-17
**Référence cahier des charges** : ENT-69 (solde et reversements : « historique et relevés PDF »). Le solde, la demande et l'historique existaient ; seul le relevé manquait.

## Backend (`backend/src/modules/wallets/`)

| Fichier | Rôle |
| --- | --- |
| `domain/payout-statement.ts` | Données du relevé, numéro `REL-XXXXXXXX` (dérivé de l'id, stable), règle « relevé seulement si exécuté », compte masqué (4 derniers caractères). |
| `domain/payout-statement-renderer.port.ts`, `infrastructure/pdfkit-payout-statement-renderer.adapter.ts` | Rendu PDF (PDFKit, comme factures et certificats). |
| `application/generate-payout-statement.use-case.ts` | Contrôle d'appartenance, statut, nom de l'entreprise via `TenantsFacade`. |
| `presentation/business-wallet.controller.ts` | `GET /business/wallet/payouts/:payoutId/statement` (permission `wallet.view`). |
| `domain/payout.entity.ts`, `infrastructure/payout.prisma-repository.ts` | La date d'exécution est maintenant portée par l'entité (`executedAt`, colonne déjà présente) au lieu d'être posée par le dépôt à chaque sauvegarde. |

Garanties : un reversement d'une autre entreprise renvoie 404 (même réponse qu'un identifiant inexistant) ; un reversement non exécuté renvoie `RELEVE_INDISPONIBLE` ; le numéro de compte n'est jamais imprimé en entier.

## Front Entreprise (`business/features/wallet/`)

Colonne « Relevé » dans l'historique des reversements : bouton PDF uniquement pour les reversements exécutés. Le proxy relaie déjà le binaire PDF (corrigé à l'étape 03).

## Limites connues

- Le relevé décrit le reversement (montant, dates, destination) mais **pas le détail des ventes** qui le composent : le grand livre ne relie pas un reversement à des ventes précises.
- Pas de logo ni de mentions légales de l'émetteur (à définir avec le client).
- Les reversements déjà exécutés conservent leur date d'exécution (l'ancien dépôt l'enregistrait déjà en colonne) ; aucune reprise de données n'est nécessaire.

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 72 suites / 459 tests OK (nouveaux : génération, isolation entre entreprises, refus pour chaque statut non exécuté, rendu `%PDF-`).
- Business : `tsc`, ESLint OK, 27 tests OK.
- Non testé de bout en bout (base de données, téléchargement dans le navigateur).
