# Étape 06 — Suivi et notifications des remboursements

**Date** : 2026-11-17
**Suite de** : [étape 05](05-demandes-de-remboursement.md). Corrige deux limites notées alors : l'apprenant ne voyait pas le statut de sa demande, et aucune notification n'était envoyée.

## Backend

- **Événement public** `RefundRequestDecidedEvent` (`payments/payments.events.ts`), émis quand l'entreprise accepte ou refuse, et quand l'Admin exécute le remboursement. Il porte l'apprenant à notifier, la formation, l'issue (`ACCEPTED`, `REJECTED`, `REFUNDED`), le motif et le montant.
- **Notification in-app** à l'apprenant : `notifications/application/refund-request-decided.listener.ts` + trois gabarits (`refund.accepted`, `refund.rejected`, `refund.refunded`, français et anglais). Le module notifications ne dépend du module payments que par cet événement public.
- **Suivi apprenant** : `GET /public/refunds/my` (permission `learner.request-refund`). La réponse est une **liste blanche** (formation, montant, statut, motif de l'apprenant, motif de refus, dates) : ni identifiant de paiement ou d'entreprise, ni coordonnées.
- La vue `RefundRequest` porte désormais `enrollmentId` et `learnerUserId`.

## Front apprenant (`learning/features/refunds/`)

La section de la page de formation affiche l'état de la dernière demande : en cours d'examen, acceptée, remboursée, ou refusée **avec le motif de l'entreprise**. Seule une demande refusée permet d'en déposer une nouvelle. Schémas, API, hook et textes restent dans la feature.

## Limites connues

- Notification **in-app seulement** (pas d'e-mail) : cohérent avec la notification d'inscription existante.
- L'entreprise n'est pas notifiée d'une nouvelle demande ; elle la voit en ouvrant `/refunds`.
- Tout le reste de l'étape 05 reste vrai (remboursement intégral uniquement, éligibilité non calculée, remboursement manuel non tracé).

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 71 suites / 452 tests OK. Nouveaux tests : les cas d'usage (isolation entre entreprises, motif nettoyé, aucune émission si la décision est invalide, le fournisseur n'est jamais appelé pour une demande non acceptée, événements émis) et les gabarits.
- Learning : `tsc` et ESLint OK.
- Non testé de bout en bout (base de données, navigateur) ; l'affichage de la notification dans la page Notifications de `learning` n'a pas été vérifié visuellement.
