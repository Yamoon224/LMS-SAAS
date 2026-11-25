# Étape 38 — Examens (pondération, tentatives) et sessions live (pointage, .ics)

**Date** : 2026-11-19
**Référence cahier des charges** : ENT-34 (pondération), ENT-37 (tentatives d'examen côté entreprise), ENT-56 (.ics), ENT-57 (pointage manuel de présence). Les rappels WhatsApp (ENT-56) ne sont pas traités : ils dépendent d'un fournisseur externe.

## Choix de conception (pris sans consultation, à valider)

1. **Pondération par question déjà présente** (`Question.points`, utilisé par `Attempt.computeScore`) : vérifiée, inchangée.
2. **Pondération par évaluation** : champ additif `weight` (entier, défaut 1) sur `Exam` et `Quiz`. Note finale = moyenne pondérée des meilleures notes (RG-11) des quiz de module et de l'examen. Poids 0 = exclu ; évaluation sans note = ignorée ; aucune note = `null`. Calcul dans le domaine pur `weighted-final-score.ts`.
3. **Tentatives : filtrage en mémoire** après enrichissement des noms (une requête utilisateurs), car nom et e-mail vivent dans un autre module. Pagination bornée à 100 par page ; export CSV plafonné à 5000 lignes, avec BOM UTF-8, CRLF et neutralisation des formules tableur.
4. **Contrôle de tenant** via la formation de l'examen (`assertCourseInTenant`) : un examen d'un autre tenant répond 404, y compris pour le détail et le CSV.
5. **Pointage manuel** : l'entreprise ne pointe que les apprenants **inscrits** à la session (ligne `Attendance` existante). Le pointage met `attended` à vrai/faux et pose `markedManually` : il **prime** sur le calcul automatique de présence (RG-08b) à la déconnexion. Statuts affichés : `PRESENT`, `ABSENT`, `PENDING` (pas de verdict).
6. **Audit** : événement `live-attendance.marked` consommé par `AuditSensitiveEventsListener` (acteur, apprenant, présent/absent).
7. **.ics** : le constructeur RFC 5545 existait déjà (échappement, UID stable, pliage à 75 octets sans couper un caractère multi-octets, CRLF, rappel). Ajouts : en-tête `X-WR-TIMEZONE` (fuseau IANA validé par `Intl`, sinon ignoré), alias `GET /public/live-sessions/:id/ics` (en plus de `calendar.ics`), et version gestionnaire `GET /business/live-sessions/:id/ics` (tenant contrôlé). Les heures restent en UTC (`Z`), donc sans `VTIMEZONE`.

## Backend

| Élément | Rôle |
| --- | --- |
| `assessments/domain/weighted-final-score.ts` | Moyenne pondérée pure (rejette poids négatif ou non fini). |
| `assessments/domain/attempt-query.ts` | Filtres (apprenant insensible casse/accents, statut, dates), pagination, durée, CSV. |
| `assessments/application/exam-attempts-query.use-case.ts` | Liste paginée, export CSV, détail (réponses, bonne réponse, note, durée). |
| `assessments/application/get-weighted-final-score.use-case.ts`, `AssessmentsFacade.getWeightedFinalScore` | Note finale pondérée d'une inscription. |
| `assessments/presentation/business-assessment-attempts.controller.ts` | `GET /business/assessments/:examId/attempts` (query : `learner`, `status`, `from`, `to`, `page`, `pageSize`), `…/attempts/export.csv`, `…/attempts/:attemptId` (permission `courses.manage`). |
| `live-sessions/application/manage-session-attendance.use-case.ts` | Liste des inscrits et pointage (tenant contrôlé, événement d'audit). |
| `live-sessions/presentation/business-live-sessions.controller.ts` | `GET/POST /business/live-sessions/:id/attendance`, `GET …/:id/ics` (permission `live-sessions.manage`). |

L'ancienne route `GET /business/courses/:courseId/exam/attempts` est conservée.

## Fronts

- **Entreprise** : la page « Tentatives d'examen » passe en mode serveur (recherche apprenant, filtre statut, période, pagination, export CSV serveur, états chargement/erreur/vide, cartes en mobile via le tableau de données), détail d'une tentative en lecture seule (dialogue) et accès à « Accorder des tentatives » par ligne. Champ « Poids dans la note finale » dans les règles de l'examen. Sessions live : actions « Pointer la présence » (dialogue tableau / `MobileCardList`) et « Ajouter à l'agenda (.ics) ».
- **Apprenant** : le lien « Ajouter à mon agenda » existait déjà (`vitrine.live.addToCalendar`, présent dans les 8 dictionnaires) ; aucune clé ajoutée.

## Modèle de données — à appliquer (strictement additif)

- `Exam.weight Int @default(1)` (`weight`) ; `Quiz.weight Int @default(1)` (`weight`).
- `Attendance.markedManually Boolean @default(false)` (`marked_manually`), `Attendance.markedById String?` (`marked_by_id`), `Attendance.markedAt DateTime?` (`marked_at`).
- À faire : `prisma db push` puis `prisma generate`. Avant cela, `tsc` signale les champs ci-dessus dans les dépôts Prisma (attendus).
- Aucune nouvelle permission.

## Limites connues

- La note finale pondérée est calculée et exposée par la façade, mais **n'est pas encore branchée** sur le certificat (qui garde la meilleure note d'examen) ni sur un écran.
- Le poids du quiz est accepté par l'API (`weight` dans les règles du quiz) mais n'a pas de champ dans le formulaire du quiz côté entreprise (seul l'examen en a un).
- Liste des tentatives : chargement complet de l'examen puis filtrage en mémoire (suffisant pour des volumes de cohorte ; à indexer si un examen dépasse quelques dizaines de milliers de tentatives).
- Le pointage ne crée pas d'inscription à la session : un apprenant non inscrit répond 404.
- Rappels WhatsApp non faits (fournisseur externe).
- Le champ de recherche du tableau déclenche un rechargement serveur à chaque saisie (débounce de 300 ms du tableau).

## Vérification

- Backend : `jest` sur `assessments` et `live-sessions` (20 suites, 133 tests) OK ; tests ajoutés : pondération, filtres/pagination/CSV des tentatives, détail et tenant, pointage (dont priorité sur la présence automatique), `.ics` (fuseau, tenant gestionnaire).
- Business : `tsc` OK, vitest `assessments` OK, ESLint sans erreur.
- **Non testé** : exécution sur une vraie base, parcours navigateur.
