# Étape 12 — Historique d'achats et profil de l'apprenant

**Date** : 2026-11-17
**Référence cahier des charges** : PUB-18 (historique d'achats), PUB-07 (accès à la demande de remboursement depuis l'historique), PUB-04 (profil), PUB-17 (choix de la langue préférée, en partie).

## Backend

### Historique d'achats — `payments`

| Fichier | Rôle |
| --- | --- |
| `domain/purchase-history.ts` (+ spec) | Type `PurchaseHistoryItem` et tri « plus récent d'abord ». |
| `domain/purchase-history.repository.port.ts`, `infrastructure/purchase-history.prisma-repository.ts` | Paiements en ligne de formations de l'apprenant (avec statut de sa dernière demande de remboursement) **et** inscriptions réglées hors plateforme (depuis l'étape 04, montant et référence sont conservés). |
| `presentation/public-payments.controller.ts` | `GET /public/payments/history` (permission `learner.view-own-enrollments`). |

L'identité vient exclusivement du jeton : aucun paramètre d'identifiant n'est accepté, un apprenant ne peut donc pas lire les achats d'un autre.

### Profil — `users`

| Fichier | Rôle |
| --- | --- |
| `application/get-own-profile.use-case.ts` (+ spec) | Renvoie id, e-mail, prénom, nom, téléphone, langue — sans rôles ni statut. |
| `presentation/public-account.controller.ts` | `GET` et `PATCH /public/account/me`. |
| `presentation/dto/update-own-profile.dto.ts` (+ spec) | Seuls prénom, nom, téléphone et langue (parmi fr, en, es, de, ar, zh, ru, tr) sont modifiables ; jamais l'e-mail, le statut, le type de compte ni les rôles. Le contrôleur transmet une liste blanche explicite de champs. |
| `domain/user.entity.ts` | Getters `firstName` et `lastName`. |

Le cas d'usage de mise à jour du profil existait déjà mais n'était exposé par aucune route.

**Permission** : ces routes réutilisent `learner.view-own-enrollments` (tout apprenant l'a déjà) pour ne pas imposer un rattrapage des rôles existants.

## Front apprenant (`learning/`)

- `features/purchases/` : page `/purchases` — une carte par achat (formation, date, moyen, montant, statut, statut du remboursement, mention « hors plateforme »), état vide avec lien vers le catalogue ; pour un achat en ligne payé sans demande en cours, le bouton mène à la page de la formation où se trouve le formulaire de demande (étapes 05 et 06).
- `features/profile/` : page `/profile` — e-mail en lecture seule, prénom, nom, téléphone, langue, bouton désactivé tant que rien n'a changé, lien « changer mon mot de passe » vers le parcours de réinitialisation (étape 09).
- Menu utilisateur : entrées « Mes achats » et « Mon profil ». Les deux chemins sont protégés par le middleware.
- Le relais `/api/backend` n'acceptait que GET et POST : **PATCH ajouté** (les préfixes autorisés restent `public/` et `notifications`).
- Textes propres à chaque feature (`purchases-copy.ts`, `profile-copy.ts`).

## Limites connues

- La langue choisie est enregistrée et sert aux e-mails et notifications ; **l'interface elle-même reste en français** (les fichiers de traduction ne sont pas branchés). PUB-15/17 ne sont donc couverts qu'en partie.
- PUB-16 (qualité vidéo adaptative avec choix manuel, pages légères) n'est pas traité.
- Pas de reçu ou facture PDF pour l'apprenant.
- Un achat « en attente » ou « échoué » est listé sans action de reprise du paiement depuis l'historique.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 78 suites / 489 tests OK (nouveaux : tri des achats, profil, champs interdits du DTO). Les requêtes Prisma de l'historique ne sont pas couvertes par un test automatisé.
- Learning : `tsc`, ESLint OK (pas de tests dans cette app).
- **Non testé** : exécution sur une vraie base, affichage et envoi du formulaire dans le navigateur.
