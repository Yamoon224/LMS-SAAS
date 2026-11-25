# Étape 08 — Rapports par formation

**Date** : 2026-11-17
**Référence cahier des charges** : ENT-67 (lot V1) — entonnoir (inscrits, démarré, modules validés, examen réussi), points de blocage (modules avec le plus d'échecs), questions les plus échouées. Termine la section 6.5.

## Définitions retenues

| Mesure | Définition |
| --- | --- |
| Inscrits | Inscriptions ayant donné accès (statuts actif, terminé, expiré, suspendu). |
| Ont démarré | Inscrits avec au moins une leçon ouverte ou commencée. |
| Au moins un module validé | Inscrits avec au moins un quiz de module réussi. |
| Examen réussi | Inscrits ayant réussi l'examen final. |
| Taux d'échec d'un module | Tentatives échouées / tentatives terminées du quiz du module (top 5, du plus bloquant au moins bloquant). |
| Question échouée | Réponse différente de l'ensemble exact des bonnes options (même règle que la correction) ; une question sans réponse compte comme échouée. Seules les questions posées **au moins 3 fois** et échouées au moins une fois sont listées (top 10) : en dessous, le taux n'est pas significatif. |

## Backend (`backend/src/modules/analytics/`)

| Fichier | Rôle |
| --- | --- |
| `domain/course-report.ts` | Fonctions pures : `buildFunnel`, `rankBlockingModules`, `rankFailedQuestions`, `buildCourseReport`. |
| `domain/course-report.repository.port.ts`, `infrastructure/course-report.prisma-repository.ts` | Lecture des données brutes (formation, quiz, examen, comptages, tentatives). |
| `application/get-course-report.use-case.ts` | Cas d'usage ; formation d'une autre entreprise → 404. |
| `presentation/business-analytics.controller.ts` | `GET /business/analytics/courses/:courseId/report` (permission `analytics.view`). |

Les agrégations lisent directement les tables Prisma, comme le tableau de bord existant du même module (précédent documenté dans `analytics.prisma-repository.ts`). Les requêtes sont filtrées par entreprise. **Garde-fou** : les 5 000 tentatives les plus récentes seulement alimentent le classement des questions ; les comptages de l'entonnoir, eux, portent sur toutes les inscriptions.

## Front Entreprise (`business/features/course-reports/`)

Page `/courses/[id]/report` (barres de l'entonnoir accessibles avec `role="progressbar"`, tableau des modules bloquants, liste des questions échouées avec leur origine), bouton « Rapport » sur la fiche formation. La règle d'accès de l'interface pour cette route est alignée sur le backend (`analytics.view`, et non `courses.manage`).

## Limites connues

- Les Formateurs ont `courses.manage` mais pas `analytics.view` : ils voient le bouton « Rapport » mais obtiennent « accès non autorisé ». Donner `analytics.view` au rôle Formateur est une décision produit à prendre.
- Pas de filtre par période : le rapport couvre toute la vie de la formation.
- Une question modifiée ou supprimée après coup est comptée avec ses options actuelles ; les tentatives portant sur une question supprimée sont ignorées.
- Pas d'export du rapport.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 74 suites / 470 tests OK (nouveaux : entonnoir, division par zéro, classement des modules, seuil de significativité, choix multiple exact, réponse absente, isolation entre entreprises).
- Business : `tsc`, ESLint OK, 27 tests OK.
- Non testé sur une vraie base ni dans le navigateur ; les requêtes Prisma du rapport n'ont donc pas été exécutées.
