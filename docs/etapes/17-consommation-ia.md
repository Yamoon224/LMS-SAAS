# Étape 17 — Consommation IA (vue Admin)

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-34 (lot V1) — « tâches de traduction par entreprise, crédits consommés, coût fournisseur estimé, marge ».

## Définitions retenues

| Mesure | Définition |
| --- | --- |
| Tâches | Toutes les tâches de traduction **créées** sur la période (estimations non confirmées comprises), par entreprise. |
| Crédits consommés | Crédits débités des tâches **terminées** uniquement. Une tâche échouée est remboursée automatiquement (section 9.5) et ne compte pas. |
| Mots traduits | Mots comptés à l'estimation des tâches terminées. |
| Coût fournisseur estimé | Mots traduits × tarif par mot configuré. **Non configuré** (jamais 0) tant que le tarif n'est pas renseigné ou s'il est invalide. |
| Valeur d'un crédit | Prix moyen observé : total payé pour les packs vendus / total des crédits correspondants. Inconnue sans aucune vente de pack. |
| Marge estimée | Valeur des crédits consommés − coût fournisseur estimé ; affichée seulement si **les deux** sont connus. |

Les crédits offerts par un plan (sans paiement) sont valorisés au même prix moyen que les crédits achetés : la marge est une **estimation**, pas un chiffre comptable.

## Backend (`backend/src/modules/analytics/`)

| Fichier | Rôle |
| --- | --- |
| `domain/ai-consumption.ts` (+ spec) | Agrégation par entreprise, coût, valeur, marge ; lecture sûre du tarif (`parseCostPerWord`) ; prix moyen d'un crédit. |
| `domain/ai-consumption.repository.port.ts`, `infrastructure/ai-consumption.prisma-repository.ts` | Comptages groupés (par entreprise et statut) et ventes de packs. Aucune écriture, aucun contenu de formation lu. |
| `application/get-ai-consumption.use-case.ts` (+ spec) | Lit `AI_TRANSLATION_COST_PER_WORD` et assemble le rapport. |
| `presentation/admin-ai-consumption.controller.ts` | `GET /admin/analytics/ai-consumption?from=&to=` (permission `analytics.view`, défaut : mois courant). |

**Configuration** : variable `AI_TRANSLATION_COST_PER_WORD` (documentée dans `.env.example`), dans la même devise que les prix des packs. Laisser vide tant que le tarif du fournisseur n'est pas connu. Aucun schéma de base ni permission à ajouter.

## Front Admin (`admin/features/ai-consumption/`)

Page `/ai-consumption` (menu « Suivi ») : filtre de période de l'analytique (raccourcis et dates), quatre tuiles de synthèse, tableau par entreprise (tri, recherche, export), mention « Non configuré » avec l'indication de la variable à renseigner, et rappel que coût et marge sont des estimations.

## Limites connues

- **Aucun tarif n'est fourni** : tant que `AI_TRANSLATION_COST_PER_WORD` n'est pas renseigné, coût et marge s'affichent « Non configuré ». Le tarif réel dépend de votre fournisseur d'IA (non précisé dans le cahier des charges).
- Le coût est proportionnel aux mots comptés à l'estimation, pas aux jetons réellement facturés par le fournisseur.
- Un tarif unique pour toutes les langues et tous les fournisseurs ; pas d'historique de tarif (un changement s'applique rétroactivement à toutes les périodes affichées).
- La date de rattachement d'une tâche est sa **date de création** : une tâche créée en fin de mois et terminée le suivant est comptée sur le premier.
- Pas de détail par tâche ni par langue cible.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 89 suites / 591 tests OK. Nouveaux : 21 (crédits des seules tâches terminées, regroupement et classement, coût/valeur/marge jamais inventés, tarif invalide traité comme non configuré, prix moyen d'un crédit, période transmise).
- Admin : `tsc`, ESLint OK, 30 tests OK.
- **Non testé** : exécution des requêtes groupées sur une vraie base, affichage dans le navigateur.
