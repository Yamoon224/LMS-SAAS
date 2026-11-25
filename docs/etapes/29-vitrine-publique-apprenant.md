# Étape 29 — Vitrine publique et confort apprenant

**Date** : 2026-11-18
**Référence cahier des charges** : PUB-01, 02, 03, 05, 09, 12, 13, 18 (section 7) ; SEO. Rapport d'écarts : `docs/RAPPORT-CONFORMITE-CDC.md`, section « Apprenant ».

## Exigences traitées

| # | Exigence | Résultat |
| --- | --- | --- |
| 1 | PUB-02 Catalogue : filtres langue, niveau, prix, tri | **Fait** (backend + front) |
| 2 | PUB-01 Accueil : présentation, formations à la une, catégories, appel à l'inscription | **Fait** |
| 3 | PUB-03 Fiche : programme, formateurs, langues, sessions live, type certifiant | **Fait** ; objectifs et prérequis **absents du modèle, non inventés** |
| 4 | SEO : sitemap, robots, Open Graph/Twitter, JSON-LD, hreflang | **Fait** (voir limites) |
| 5 | PUB-05 Tableau de bord agrégé | **Fait** |
| 6 | PUB-13 .ics et bouton « Rejoindre » à T-15 min | **Fait** |
| 7 | PUB-12 Partage LinkedIn | **Fait** (le téléchargement PDF existait déjà) |
| 8 | PUB-09 Visionneuse PDF intégrée | **Fait** |
| 9 | PUB-18 Rappel d'inactivité | **Fait** |

## Choix pris sans consultation (à valider)

1. **Nouveau module backend `catalogue`.** `course-content` dépend déjà de `courses` : `courses` ne peut donc pas lire le programme sans cycle. Les routes publiques `GET /public/courses` et `GET /public/courses/:id` ont été **déplacées** de `courses` vers `catalogue`, qui agrège `courses`, `course-content`, `live-sessions`, `users` et `languages` par leurs façades. Mêmes URL.
2. **Filtrage en mémoire** (fonctions pures) sur la liste des formations publiées du tenant, puis pagination : simple et testable, suffisant pour des catalogues de quelques centaines de formations. À passer en requête SQL si un tenant dépasse ~1 000 formations publiées.
3. **« Langue » d'une formation** = sa langue d'origine **ou** toute traduction publiée dont la langue est encore activée sur la plateforme (même règle que PUB-17).
4. **Niveau** : le champ `Course.level` est du texte libre ; le filtre accepte un motif sûr (`[A-Za-z0-9_-]`), comparé sans casse, et les valeurs proposées viennent des formations réelles (facettes).
5. **`pageSize` supérieur à 50 est ramené à 50** (pas d'erreur) ; tout autre paramètre hors règle (tri inconnu, `price` ≠ free|paid, `page` ≤ 0, valeurs répétées, texte trop long) donne **400**.
6. **« Formations à la une »** = les 6 plus récemment publiées (pas d'indicateur `featured` : changement de schéma jugé non justifié).
7. **Le catalogue complet passe de `/` à `/courses`** ; `/` devient l'accueil. Liens internes mis à jour. Les pages filtrées/paginées sont en `noindex` (canonique = `/courses`).
8. **Bannière et description de l'entreprise** : lues dans le JSON libre `Tenant.branding` (`bannerUrl` ou `banner`, `description`), URL validées http(s) ou chemin absolu, description tronquée à 600 caractères. Aucun écran d'édition n'existe encore côté Entreprise : tant que rien n'est saisi, l'accueil affiche un texte par défaut.
9. **hreflang** : la langue de l'interface étant un cookie, les alternatives pointent vers `?lang=xx`. Le middleware accepte ce paramètre (huit langues connues seulement) et le mémorise comme le sélecteur. Les alternatives sont émises pour les langues de la formation (origine + traductions publiées).
10. **Rappel d'inactivité** : dernière activité = dernière mise à jour d'une progression de leçon, à défaut début ou création de l'inscription. Ajout de deux colonnes (voir « Actions »). Le rappel est **réservé en base avant l'envoi** (mise à jour conditionnelle) : deux passages ou deux instances n'envoient pas deux fois. Exécution quotidienne à 09h00 (`@Cron`), 500 inscriptions examinées au plus par passage.
11. **« Rejoindre »** : appliqué aussi côté serveur (`POST …/join` refuse hors fenêtre avec `SESSION_NON_REJOIGNABLE`), pas seulement par le bouton. Le lien de connexion reste renvoyé aux inscrits (il est déjà envoyé par e-mail à la planification).
12. **Certificats récents et notifications non lues** du tableau de bord sont lus par l'écran auprès des routes existantes (certificates, notifications) : l'endpoint agrégé couvre en cours, terminées et sessions à venir. L'icône LinkedIn n'existant plus dans `lucide-react`, le bouton utilise une icône de partage.
13. **Visionneuse PDF** : cadre sur l'URL signée, sans dépendance. Quand `downloadAllowed` est faux : barre masquée par `#toolbar=0` (confort, **pas une protection**) et aucun lien vers le fichier.

## Fichiers clés

**Backend**
- `modules/catalogue/` : `domain/catalogue-query.ts` (validation, filtres, tri, pagination, facettes), `application/list-public-catalogue.use-case.ts`, `application/get-public-course.use-case.ts`, `presentation/public-catalogue.controller.ts`, `catalogue.module.ts`.
- `modules/courses/` : façade (`listPublished`, `findPublished`, `listPublishedLocalesByCourses`), dépôt des fiches traduites.
- `modules/tenants/domain/public-branding.ts` : `bannerUrl`, `description`.
- `modules/live-sessions/` : `domain/ics-calendar.ts`, `domain/live-session-join-window.ts`, `application/get-live-session-calendar.use-case.ts`, route `GET /public/live-sessions/:id/calendar.ics`, façade `listUpcomingForCourses`.
- `modules/enrollments/` : `domain/learner-dashboard.ts`, `application/get-learner-dashboard.use-case.ts`, route `GET /public/enrollments/dashboard` ; `domain/inactivity-reminder.ts`, `application/send-inactivity-reminders.use-case.ts`, cron dans `enrollments.scheduler.ts`, événement `enrollment.inactivity-detected`.
- `modules/notifications/` : `application/enrollment-inactivity.listener.ts`, gabarit `enrollment.inactivity-reminder` (fr, en) et variables dans `template-overrides.ts`.
- `prisma/schema.prisma` : `Enrollment.lastInactivityReminderAt`, `Progress.updatedAt`.

**Learning**
- `app/(site)/page.tsx` (accueil), `app/(site)/courses/page.tsx` (catalogue), `app/(site)/courses/[id]/page.tsx` (fiche, métadonnées, JSON-LD), `app/sitemap.ts`, `app/robots.ts`, `middleware.ts` (`?lang=`), `app/api/backend/[...path]/route.ts` (conserve `Content-Disposition`).
- `features/catalogue/` : `lib/catalogue-filters.ts`, `lib/seo.ts`, composants `CatalogueFilters`, `CataloguePagination`, `CourseDetailSections`.
- `features/dashboard/`, `features/live-sessions/` (`lib/join-window.ts`, `SessionJoinActions`), `features/certificates/lib/linkedin.ts`, `features/player/` (`PdfViewer`, `lib/pdf-viewer.ts`), `lib/site-url.ts`, `lib/lang-param.ts`.
- Textes : section `vitrine` ajoutée aux **huit** dictionnaires.

## Actions à mener hors du code

1. **Schéma** : appliquer `prisma/schema.prisma` (`prisma db push` ou votre procédure) pour `enrollments.last_inactivity_reminder_at` et `progress.updated_at` (défaut `now()` : les lignes existantes ont une date de dernière activité égale à la date d'application ; les rappels d'inactivité commencent donc 7 jours après).
2. Pour afficher bannière et description : renseigner `branding.bannerUrl` et `branding.description` du tenant (aucun écran dédié).
3. Les traductions du dictionnaire `vitrine` sont à faire relire par des locuteurs natifs (comme l'étape 24).

## Limites connues

- Objectifs pédagogiques et prérequis : non affichés, le modèle `Course` ne les porte pas.
- Le filtrage est en mémoire (voir choix 2).
- Les hreflang décrivent la langue de l'**interface** (`?lang=`), alors que le titre et la description de la fiche restent dans la langue d'origine : les traductions de formation ne sont servies qu'aux inscrits (étape 19).
- Le « modèle de certificat » côté visiteur se limite à « certifiante ou non » (pas d'aperçu du modèle).
- `lastActivityAt` ignore l'activité qui ne touche pas une progression (ex. tentative de quiz seule).
- Le lecteur PDF dépend de la visionneuse du navigateur : sur mobile, certains navigateurs n'affichent pas les PDF dans un cadre, d'où le repli.
- Le catalogue public n'a pas de cache HTTP partagé (réponses propres à un tenant, résolu par le host).
- Les messages d'erreur 400 du backend restent en français.

## Vérifications

- **Backend** : `tsc` sans erreur dans les modules touchés (des erreurs préexistantes d'autres chantiers subsistent dans `audit`, `media`, `users`, `payments`) ; ESLint sans nouvel avertissement ; `arch:check` sans violation ; tests ajoutés : filtres/tri/pagination/validation du catalogue (paramètres hors liste blanche, `pageSize` géant, injection), fiche publique (aucun `contentHtml`, URL de média, lien de session ni e-mail ; 404 non publié/autre tenant ; formateur d'un autre tenant écarté), `.ics` (titre avec retours à la ligne et virgules, UID stable, pliage UTF-8, lien dangereux, nom de fichier sans titre, accès refusé 404), fenêtre de connexion, tableau de bord, règle de sélection du rappel d'inactivité (statuts, 7 j, 14 j, accès expiré), non-répétition entre deux passages, gabarit fr/en.
- **Learning** : `tsc`, ESLint, `vitest` (filtres d'URL, SEO/JSON-LD échappé, `site-url` avec hosts piégés, `?lang=`, fenêtre de connexion, LinkedIn encodé, URL du PDF), `next build`.
- **Non testé** : exécution contre une vraie base (requêtes Prisma des candidats d'inactivité et des sessions à venir), envoi réel des e-mails de rappel, rendu dans un navigateur (filtres, accueil, RTL, visionneuse PDF sur différents navigateurs), import du `.ics` dans Google/Apple/Outlook, ouverture du formulaire LinkedIn, lecture du sitemap/robots par un robot, aperçu Open Graph.
