# Étape 19 — Traductions de formation lisibles par l'apprenant

**Date** : 2026-11-17
**Référence cahier des charges** : PUB-17 (lot V1) — « basculer la formation dans une autre langue disponible ; la progression est commune à toutes les langues ».

> Ne pas confondre avec PUB-15 (langue de l'**interface**), qui reste à faire : voir « Limites ».

## Constat de départ

Les traductions IA étaient bien écrites en base (fiche formation et leçons), mais **jamais lues** : aucun écran ni route n'affichait une traduction, et le commentaire du code annonçait « la publication reste une action manuelle du gestionnaire » alors qu'**aucune route ne permettait de publier**. Les traductions restaient donc en brouillon pour toujours et ne pouvaient pas être montrées.

## Correctif de sécurité en chemin

Le contenu HTML traduit (renvoyé par un fournisseur d'IA externe) était enregistré **sans assainissement**, contrairement aux leçons d'origine (BE-09). Tant que rien ne le servait, c'était sans effet ; ce chantier le sert aux apprenants. Il est donc assaini :
- **à l'écriture** (`UpsertLessonLocaleUseCase`) ;
- **à la lecture**, à chaque service d'une traduction : la fonction est idempotente et couvre aussi les lignes écrites avant la correction. C'est une exception délibérée à la règle « ne pas ré-assainir » des leçons d'origine, limitée au contenu traduit. Un test prouve que scripts et gestionnaires d'événements disparaissent dans les deux cas.

## Parcours

1. **Entreprise** (page « Traduction IA ») : sous la formation choisie, la liste de ses traductions avec statut (brouillon ou publiée) et couverture (leçons traduites sur le total). Le gestionnaire relit puis **publie** (ou **retire**) une langue pour **toute la formation** d'un coup, avec confirmation.
2. **Apprenant** (lecteur de formation) : un sélecteur « Langue de la formation » apparaît dès qu'au moins une traduction est lisible. Le choix est mémorisé **par inscription** dans le navigateur. Titres de leçons et contenu passent dans la langue choisie ; la progression n'en dépend pas (elle est rattachée à la leçon).

## Règles (fonctions pures, testées)

- Une langue n'est lisible que si **sa fiche est publiée ET que la langue est toujours activée** sur la plateforme (ADM-40). Désactiver une langue la retire donc aussi de la lecture, sans toucher aux traductions.
- **Un brouillon n'est jamais servi.** Une demande non satisfaisable (langue non publiée, retirée, désactivée, inconnue, ou leçon sans traduction publiée) retombe **silencieusement sur la langue d'origine** : changer de langue ne doit jamais empêcher de suivre la formation. La réponse indique la langue réellement servie (`contentLocale`) ; l'écran affiche « cette leçon n'est pas encore traduite » dans ce cas.
- **Repli champ par champ** : un titre traduit sans contenu traduit garde le contenu d'origine (pas de leçon vide).
- Publication **par formation et par langue**, pas leçon par leçon : un apprenant ne voit pas une formation à moitié basculée par une relecture inachevée. Il faut au moins une leçon traduite ; la langue d'origine n'est pas publiable ; publier une langue désactivée est refusé.
- **Ordre des écritures** (deux modules, sans transaction commune) : la fiche de la formation est la « porte » côté apprenant. À la publication elle passe en **dernier**, au retrait en **premier**. Une interruption entre les deux ne montre jamais une langue à moitié visible.
- **Une retraduction repasse en brouillon.** Avant, régénérer une langue déjà publiée aurait publié le nouveau texte IA sans relecture.
- Arabe : le titre et le corps de la leçon prennent `lang` et `dir="rtl"` ; les boutons de navigation ne sont pas inversés.

## Backend

| Module | Éléments |
| --- | --- |
| `course-content` | `ManageLessonLocalesUseCase` (lecture publiée assainie, titres publiés, couverture, statut par formation et langue) ; `upsert-lesson-locale` assainit ; repli retraduction → brouillon ; méthodes de la **façade publique**. |
| `courses` | `ManageCourseLocalesUseCase` ; liste des fiches, fiches publiées, statut ; retraduction → brouillon ; façade. |
| `ai-translation` | `translation-publication.ts` (règles pures), `course-translations.use-cases.ts` ; routes `GET /business/ai-translation/courses/:courseId/translations`, `POST …/translations/:locale/publish` et `…/unpublish` (permission `courses.manage`, formation d'une autre entreprise → 404). |
| `enrollments` | `learner-locale.ts` (règles pures), `learner-content-locale.use-cases.ts` ; `GET /public/enrollments/:id/locales` ; `?locale=` optionnel sur `course-content` et sur une leçon ; réponses enrichies de `contentLocale`. |
| `languages` | `LanguagesFacade.filterEnabled`. |

Aucun changement de schéma ni de permission : les tables `course_locales` et `lesson_locales`, avec leur statut, existaient déjà.

## Fronts (chacun autonome)

- `business/features/ai-translation/` : `CourseTranslations` (liste, couverture, publier/retirer avec confirmation) ; la langue cible de l'estimation vient désormais de la liste des langues activées (étape 16).
- `learning/features/player/` : `ContentLanguageSwitcher`, magasin de préférence `content-locale-store` (valeurs de forme `fr`/`pt-BR` seulement, stockage protégé : une valeur corrompue ou un stockage bloqué ne casse rien), `NotTranslatedNote`, hooks et API avec `?locale=`. Les clés de cache incluent la langue ; les invalidations existantes (par préfixe) continuent de viser toutes les langues.
- `learning` reçoit sa **propre configuration de test** (`vitest.config.mts`, script `test`, dépendance `vitest`) : c'était la seule app sans test. `pnpm install --offline` a mis à jour `pnpm-lock.yaml`.

## Limites connues

- **PUB-15 (traduction de l'interface elle-même) n'est pas fait.** Les ~400 textes de l'interface apprenant sont des chaînes françaises utilisées dans 61 fichiers ; la traduction dans huit langues demande un chantier à part et une relecture par des locuteurs. Ce chantier ne traduit **que le contenu des formations**.
- Seuls sont traduits : titre et fiche de la **formation** (côté base), **titres et contenu des leçons**. Les **titres de modules, les questions des quiz et de l'examen** restent dans la langue d'origine, de même que le titre de la formation dans le catalogue et le hub d'inscription (le sommaire et la leçon sont traduits).
- La fiche traduite ne contient aujourd'hui qu'un **titre** : sous-titre et description sont enregistrés vides par la traduction IA.
- La préférence de langue est **locale au navigateur** (par inscription) : elle ne suit pas l'apprenant d'un appareil à l'autre.
- Une leçon ajoutée après la traduction s'affiche dans la langue d'origine tant qu'elle n'est pas retraduite ; la couverture le signale côté entreprise.
- Pas de relecture assistée (comparaison côte à côte) : le gestionnaire relit dans l'éditeur de la formation avant de publier.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 97 suites / 661 tests OK. Nouveaux : 45 (assainissement à l'écriture et à la lecture, brouillon jamais servi, repli champ par champ, langue non lisible ignorée sans requête superflue, accès sans droit refusé, **ordre des écritures à la publication et au retrait**, refus de publier la langue d'origine ou une langue sans traduction ou désactivée, formation d'une autre entreprise).
- Business : `tsc`, ESLint OK, 27 tests OK. Admin : inchangé, `tsc` OK.
- Learning : `tsc`, ESLint OK, **9 tests** (magasin de préférence : persistance, valeurs invalides, stockage corrompu ou indisponible ; sens d'écriture).
- **Non testé** : exécution des requêtes sur une vraie base, publication d'une vraie traduction IA, affichage et changement de langue dans le navigateur (sélecteur, rendu de droite à gauche).
