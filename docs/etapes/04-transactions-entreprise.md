# Étape 04 — Transactions (ventes en ligne et hors plateforme)

**Date** : 2026-11-17
**Référence cahier des charges** : section 6.5 — ENT-68 (historique des ventes : brut, commission, frais, net ; paiements hors plateforme validés ; export CSV/Excel). ENT-66 (tableau de bord) était déjà fait ; ENT-67 (rapports par formation, V1) et ENT-70 (demandes de remboursement) restent à faire.

## Anomalie corrigée en chemin (RG-07)

Lors de la validation d'un paiement hors plateforme, la référence et le montant déclaré par le gestionnaire étaient demandés puis **jetés** (seule la commission éventuelle était écrite au grand livre). Ils sont maintenant conservés sur l'inscription (`offlinePaymentReference`, `offlinePaymentAmount`, colonnes déjà présentes dans le schéma Prisma, aucune migration).
Les paiements hors plateforme validés **avant** ce correctif n'ont pas de montant enregistré : ils n'apparaîtront pas dans les transactions.

- `enrollments/domain/enrollment.entity.ts` : `recordOfflinePayment(reference, amount)`.
- `enrollments/application/validate-offline-payment.use-case.ts` : appelle la méthode avant la sauvegarde.
- `enrollments/infrastructure/enrollment.prisma-repository.ts` : lecture/écriture des deux champs.

## Backend (`backend/src/modules/wallets/`)

| Fichier | Rôle |
| --- | --- |
| `domain/transaction.ts` | Type `Transaction` et fonctions pures `breakDownOnlineSale` / `breakDownOfflineSale`. |
| `domain/transaction.repository.port.ts` | Port de lecture. |
| `infrastructure/transaction.prisma-repository.ts` | Ventes en ligne (paiements `COURSE_ENROLLMENT` encaissés, net lu au grand livre) + paiements hors plateforme (inscriptions avec montant, commission lue au grand livre). |
| `application/list-transactions.use-case.ts` | Cas d'usage. |
| `presentation/business-wallet.controller.ts` | `GET /business/wallet/transactions`, permission `wallet.view`. |

**Règle de calcul** : le grand livre ne pose que le net dû à l'entreprise. Commission = brut − net − frais, en supposant les frais fournisseur à la charge de l'entreprise (c'est la valeur par défaut codée en dur, ADM-21 ; à revoir quand ce réglage sera configurable par entreprise). Tant qu'une vente n'est pas au grand livre, commission et net valent `null` (affichés « — »). Hors plateforme : net = montant reçu − commission due.

Les requêtes sont toujours filtrées par entreprise. Pas de données d'apprenant exposées (formation et référence seulement).

## Front Entreprise (`business/features/wallet/`)

- `components/TransactionHistory.tsx` : tableau (date, formation/référence, canal, brut, commission, frais, net) avec recherche, tri, export et état vide, ajouté à la page Portefeuille.
- Schéma, API et hook dans la feature existante.

## Limites

- Les remboursements ne sont pas ventilés par ligne (le statut est renvoyé par l'API mais pas affiché).
- Pas encore de relevé PDF des reversements (ENT-69), ni de rapports par formation (ENT-67).

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 68 suites / 433 tests OK (nouveaux : ventilation brut/commission/frais/net, y compris l'exemple 50 000 FCFA de la section 9.3).
- Business : `tsc` OK, ESLint OK, 27 tests OK.
- Non testé sur une vraie base ni dans le navigateur.
