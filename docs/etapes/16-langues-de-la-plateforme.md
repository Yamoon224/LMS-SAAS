# Étape 16 — Langues de la plateforme

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-40 — huit langues (français par défaut, anglais, espagnol, allemand, arabe en droite-à-gauche, chinois, russe, turc), « mêmes langues proposées pour la traduction IA », « activation/désactivation par langue ». Troisième fonction de paramétrage plateforme (section 5.6).

## Règles métier (fonctions pures, testées)

- Liste officielle de huit langues avec leur nom natif et leur sens d'écriture (seul l'arabe est droite-à-gauche).
- Le **français est la langue par défaut : toujours actif, non désactivable**, même si un enregistrement le marquait désactivé.
- Une langue inconnue est refusée partout. Absence d'enregistrement = langue active.

## Backend — nouveau module `backend/src/modules/languages/`

| Élément | Rôle |
| --- | --- |
| `domain/language.ts` (+ spec) | Liste, `resolveLanguages`, `enabledLanguages`, `assertCanSetEnabled`, `assertEnabled`, erreurs typées. |
| `application/languages.use-cases.ts` (+ spec) | Lister (Admin), lister les langues actives (public), activer/désactiver, contrôler qu'une langue est utilisable. |
| `languages.facade.ts` | **Seule API publique** du module : `assertEnabled(code)`. |
| `admin-languages.controller.ts` | `GET /admin/languages`, `PUT /admin/languages/:code` (permission `languages.manage`). |
| `public-languages.controller.ts`, `business-languages.controller.ts` | `GET /public/languages` (public) et `GET /business/languages` (`courses.manage`) : code, nom natif, sens d'écriture, rien d'autre. |

### Là où la liste est maintenant appliquée

- **Traduction IA** (`EstimateTranslationUseCase`) : la langue cible doit exister et être activée, **avant** tout accès à la formation et sans créer de job. Avant cette étape, la langue cible était une chaîne libre de 2 à 5 caractères transmise telle quelle au fournisseur d'IA ; une valeur arbitraire est désormais refusée (test dédié).
- **Profil apprenant** (nouveau `UpdateOwnProfileUseCase`) : la langue préférée doit être une langue activée.

### Modèle de données et permission — à appliquer

- `prisma/schema.prisma` : table `language_settings` → `prisma db push`.
- Nouvelle permission plateforme **`languages.manage`** → `pnpm db:backfill-roles` pour les comptes Super Administrateur existants.

## Fronts (chacun autonome)

- `admin/features/languages/` : page `/languages` (menu « Plateforme ») — une ligne par langue avec interrupteur, badge « Langue par défaut » (français, interrupteur verrouillé) et « Droite à gauche » ; le nom s'affiche avec `lang` et `dir` corrects.
- `business/features/ai-translation/` : le champ libre « Langue cible » est remplacé par une liste des langues activées (`TargetLocaleSelect`).
- `learning/features/profile/` : le sélecteur de langue utilise les langues activées, avec repli sur la liste statique si la liste est indisponible. **La langue n'est envoyée que si elle change** : un apprenant dont la langue a été désactivée depuis peut continuer à modifier son nom ou son téléphone ; sa langue actuelle reste affichée, marquée « plus proposée ».

## Limites connues

- **Désactiver une langue ne supprime rien** : les traductions de formations et les préférences déjà enregistrées restent telles quelles. Un apprenant dont la langue est désactivée n'est pas basculé automatiquement.
- **L'interface elle-même reste en français** : activer l'anglais, l'espagnol, etc. n'ajoute pas de traductions de l'interface. Les fichiers de traduction (`src/locales`) existent mais ne sont pas branchés dans les applications ; PUB-15 et PUB-17 (traduction réelle de l'interface, changement de langue) restent à faire. Pour les e-mails, seuls le français et l'anglais ont des textes (étape 15).
- Un utilisateur d'entreprise ou un administrateur n'a pas de sélecteur de langue (seul l'apprenant en a un).
- Le rendu droite-à-gauche du contenu de l'application n'est pas traité ici (seul l'indicateur est exposé).

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, test de couverture des permissions OK (la nouvelle permission est bien dans le rôle plateforme), 87 suites / 570 tests OK. Nouveaux : 26 (règles de la liste, français verrouillé, code arbitraire refusé, cas d'usage sans écriture en cas d'erreur, profil, **traduction IA refusée avant tout accès à la formation et sans job**).
- Admin : `tsc`, ESLint, 30 tests OK. Business : `tsc`, ESLint, 27 tests OK. Learning : `tsc`, ESLint OK (pas de tests).
- **Non testé** : exécution des requêtes sur une vraie base, parcours dans le navigateur (interrupteurs, listes déroulantes).
