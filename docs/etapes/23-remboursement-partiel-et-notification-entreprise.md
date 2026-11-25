# Étape 23 — Remboursement partiel et notification de l'entreprise

**Date** : 2026-11-17
**Référence cahier des charges** : ENT-70 (examen des demandes), RG-25 (remboursement au prorata), section 9.5.

Ferme deux limites listées aux étapes 05 et 06 : l'entreprise n'était pas prévenue d'une nouvelle demande, et seul le remboursement intégral existait.

## Choix de conception (pris sans consultation, à valider)

1. **C'est l'entreprise qui fixe le montant, à l'acceptation.** Montant vide = intégral (comportement inchangé). Un montant entier strictement positif et inférieur au paiement = partiel. L'apprenant ne propose pas de montant.
2. **Un seul remboursement par achat.** Après un remboursement partiel, le paiement passe à « partiellement remboursé » et ne peut plus faire l'objet d'une nouvelle demande. Le reste est définitivement non remboursable (à valider : l'alternative, plusieurs remboursements successifs, demande de suivre un cumul).
3. **La part de l'entreprise est reprise au prorata** : net repris = net initial × montant remboursé ÷ montant payé, arrondi à l'unité. Intégral : le net est repris exactement, sans écart d'arrondi.
4. **Notification : le propriétaire de l'entreprise**, comme pour les reversements. Les autres membres ayant `refunds.manage` ne sont pas prévenus.

## Constat sur l'existant : le grand livre reprenait toujours tout

L'écouteur du grand livre ne connaissait pas le montant remboursé et **reprenait toujours la totalité** du paiement et du net de l'entreprise (un commentaire du code le disait). Un remboursement partiel aurait donc débité l'entreprise trop fortement. L'événement `RefundProcessed` porte maintenant `refundedAmount`.

## Backend

| Fichier | Changement |
| --- | --- |
| `payments/domain/refund-request.ts` | `resolveApprovedAmount` (entier, > 0, ≤ montant payé), `RefundAmountInvalidError` (`MONTANT_REMBOURSEMENT_INVALIDE`). |
| `payments/application/refund-requests.use-cases.ts` | `DecideRefundRequestUseCase` : montant accordé enregistré à l'acceptation, **validé après** la transition d'état, ignoré pour un refus ; `RequestRefundUseCase` émet `refund-request.requested`. |
| `payments/application/refund-payment.use-case.ts` | Contrôle du montant **avant** d'appeler le fournisseur ; partiel → `PARTIALLY_REFUNDED`, sinon `REFUNDED` ; événement avec le montant réel. |
| `payments/domain/payment.entity.ts` | `markPartiallyRefunded()`. |
| `wallets/domain/refund-ledger-entries.ts`, `wallets/application/record-refund-to-ledger.listener.ts` | `prorateTenantNet` ; l'écouteur utilise le montant remboursé. |
| `notifications/application/refund-requested.listener.ts`, gabarit `refund.requested` (fr, en) | Prévient le propriétaire ; gabarit modifiable dans l'Admin (variables `courseTitle`, `amount`, `currency`). |
| `payments/presentation/business-refunds.controller.ts`, `dto/refund-requests.dto.ts` | `POST /business/refunds/:id/accept` accepte `{ amount? }` (entier ≥ 1). |

L'apprenant est prévenu du **montant accordé** (gabarits `refund.accepted` et `refund.refunded`, qui affichent déjà le montant).

## Entreprise (`business/src/features/refunds/`)

Le bouton « Accepter » ouvre une fenêtre rappelant le montant payé : champ vide = intégral, ou montant pour un partiel, avec avertissement qu'un seul remboursement est possible. Un montant égal au maximum n'envoie rien (intégral). `parseAcceptedAmount` (pure, testée) refuse les décimales, zéro, les négatifs et tout dépassement.

## Limites connues

- **Aucun nouveau paramètre de commission** : seul le prorata du net est repris ; la commission de la plateforme n'est pas distinguée à l'écran.
- **Devise du grand livre figée à « XOF »** dans l'écouteur (existant, non touché).
- **Le fournisseur Pixel Innov n'a pas d'API de remboursement** : l'exécution échoue toujours pour lui (existant).
- Pas de remboursement partiel proposé par l'apprenant, ni de prorata automatique selon la progression.
- Le remboursement manuel n'est toujours pas tracé.
- Seul le propriétaire est notifié.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, tests des modules payments, wallets et notifications OK (nouveaux : montant accordé valide et invalide sans écriture ni événement, refus qui n'écrase pas le montant, partiel vs intégral côté paiement avec montant contrôlé avant le fournisseur, prorata et équilibre du grand livre, notification de l'entreprise, gabarit).
- Business : `tsc`, ESLint OK, 37 tests OK (10 nouveaux).
- **Non testé** : remboursement réel chez un fournisseur, écritures réelles du grand livre, affichage dans un navigateur.
