# Étape 26 — Création de contenu et gestion des inscrits côté entreprise

**Date** : 2026-11-18
**Référence cahier des charges** : ENT-23 (éditeur riche), ENT-24 (médias), ENT-25 (contenus obligatoires, seuil de visionnage), ENT-37 (tentatives d'examen), ENT-61 (paiement hors plateforme refusé), ENT-62 (inscription manuelle).

Le backend avait déjà le module média, le HTML de leçon assaini, `completionCriteria`, `grant-attempts` et `validate-offline-payment`. Cette étape ajoute les écrans qui manquaient dans `business` et les routes backend qui manquaient.

## Choix de conception (pris sans consultation, à valider)

1. **Tiptap à la place de CKEditor 5** (licence). Dépendances installées par `pnpm --filter business add` (réseau disponible) : `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, extensions lien, image, tableau. Version 3.34.
2. **Le fichier d'une leçon se téléverse depuis la fiche d'édition, pas à la création.** La création d'une leçon à fichier ouvre ensuite l'édition. Raison : le fichier est rattaché à une leçon existante dès la fin du téléversement, ce qui évite les médias orphelins.
3. **Une leçon porte un seul fichier** (`storageUrl` = identifiant du média, convention déjà utilisée par le lecteur apprenant). « Ressources téléchargeables » = type de leçon Document + case « téléchargement autorisé ». Pas de pièces jointes multiples par leçon.
4. **Liste blanche MIME élargie** aux tableurs et CSV (xls, xlsx, csv) pour les ressources téléchargeables. Pas d'archive (zip) ni de HTML/SVG.
5. **Quota de stockage** : `storageGb` du plan, contrôlé à la demande d'URL (octets déjà occupés + nouveau fichier). Les médias refusés ou échoués ne comptent pas. Un plan sans abonnement actif a une limite de 0.
6. **Rattachement d'un média à une leçon** : le média doit être du tenant (404 sinon), de nature cohérente avec le type de leçon (PDF = application/pdf), et ni en cours de téléversement, ni échoué, ni refusé. Une URL externe (type Lien) doit être en https. Les ressources en http, `javascript:`, `data:` ou une clé S3 brute sont refusées.
7. **Remplacement ou retrait d'un fichier** : l'ancien média est supprimé du stockage (libère le quota). Suppression d'une leçon : son média est supprimé aussi.
8. **Annulation d'un téléversement** : `DELETE /business/media/:id`, limité aux médias UPLOADING ou FAILED (409 sinon), pour ne jamais supprimer un média servi.
9. **Inscription manuelle : prix figé à 0** (aucune vente : hors chiffre d'affaires et grand livre), motif obligatoire (500 caractères), gestionnaire enregistré. Réservée aux comptes de type apprenant du tenant (un gestionnaire ne peut pas être inscrit). Formation publiée uniquement. Un apprenant inconnu est invité via le flux d'invitation existant (prénom et nom requis alors). Le quota `maxActiveLearners` est contrôlé dans le cas d'usage (testable) et non par décorateur.
10. **Refus hors plateforme** : réservé à PENDING_VALIDATION. Une inscription en attente de paiement en ligne (PENDING_PAYMENT) répond 400 (elle suit le fournisseur de paiement). Les autres statuts répondent 409 via la matrice d'états. Le motif est vérifié avant toute lecture.
11. **Permissions existantes réutilisées** : `learners.manage` (inscription manuelle), `offline-payments.validate` (refus), `courses.manage` (médias, leçons, tentatives d'examen). Aucune nouvelle permission, donc aucun changement de rôles par défaut.
12. **Seuil de visionnage** : valeur par défaut 90, bornée 1 à 100 côté écran ; critère « simple ouverture » pour PDF et documents. Un contenu non obligatoire n'envoie aucun critère.

## Backend

| Fichier | Changement |
| --- | --- |
| `prisma/schema.prisma` | `Enrollment` : `refusalReason`, `manualEnrollmentNote`, `enrolledByUserId` (pas de migration, `prisma generate` fait). |
| `enrollments/domain/enrollment-reason.ts` | Motif obligatoire : trim, caractères de contrôle retirés, 1 à 500. |
| `enrollments/domain/enrollment.entity.ts` | `refuse(reason)`, `recordManualEnrollment`, accesseurs. |
| `enrollments/application/manual-enroll.use-case.ts`, `reject-offline-payment.use-case.ts` | Nouveaux cas d'usage. Événements `enrollment.created`, `enrollment.activated`, `enrollment.refused`. |
| `enrollments/presentation/business-enrollments.controller.ts` + DTO | `POST business/enrollments/manual`, `POST business/enrollments/:id/reject-offline`. Les listes et fiches exposent le motif de refus et la note. |
| `users/users.facade.ts` | `findByEmailInTenant`, `inviteLearner`. |
| `notifications/` | Gabarit `enrollment.refused` (fr, en), variables `courseTitle` et `reason` dans `template-overrides.ts`, écouteur `enrollment-refused.listener.ts`. |
| `media/` | Quota de stockage (`assertWithinStorageQuota`), MIME élargis, DTO strict (nom sans séparateur ni caractère de contrôle, `sizeBytes` plafonné), `DELETE /business/media/:id` (abandon), `DeleteMediaAssetUseCase`, état enrichi (`mimeType`, `sizeBytes`, `downloadAllowed`), facade `getAssetInTenant` et `deleteAsset`. |
| `plans/infrastructure/plan-quota.prisma-repository.ts` | Usage `storageGb` (jauge d'usage). |
| `course-content/` | `GET /business/modules/:m/lessons/:l` (fiche d'édition avec état du média), `DELETE .../media`, validation du rattachement (`lesson-storage.ts` pur, `lesson-media.use-case.ts`), `contentHtml` pouvant être vidé. |
| `assessments/` | `GET /business/courses/:id/exam/attempts` (`list-exam-attempts.use-case.ts`, `listForExam` du dépôt). Aucune réponse exposée, seulement la note. |

## Entreprise (`business`)

| Dossier | Contenu |
| --- | --- |
| `features/rich-text/` | `RichTextEditor` (Tiptap : titres 2-3, gras, italique, souligné, listes, citation, code, lien https, image https, tableau), barre d'outils à boutons natifs (`aria-pressed`, rôle `toolbar`), invite d'URL au clavier (Entrée, Échap), assainisseur client `sanitizeEditorHtml` (liste blanche, https seulement) et `normalizeHttpsUrl`. |
| `features/lessons/` | Dialogue d'édition (nouveau), champs communs création et édition, panneau fichier (progression, annulation, état, remplacement, suppression), hooks `useMediaUpload`, `useMediaStatus` (sondage 3 s), contrôle MIME et taille côté client (`media.schema.ts`), seuil de visionnage et case obligatoire (`buildCompletionCriteria`). |
| `features/enrollments/` | `ManualEnrollmentDialog` (barre d'outils de la liste des apprenants), `RejectOfflinePaymentDialog` à côté de « Valider le paiement » (motif obligatoire), motif de refus et note d'inscription manuelle sur la fiche. |
| `features/assessments/` | Page `/courses/:id/exam/attempts` (tableau, recherche, export CSV et Excel via le composant `data-table`), lien depuis la page de l'examen. |
| `vitest.config.mts` | Alias `@` ajouté pour tester les schémas qui importent `@/lib`. |

## Actions à mener

- **CORS du bucket** : autoriser `PUT` depuis l'origine de l'application `business` (en-têtes `Content-Type`), sinon l'envoi direct échoue côté navigateur.
- Vérifier qu'une valeur `storageGb` est bien renseignée dans les quotas des plans (absent ou nul = illimité).
- Valider le choix 9 (prix 0 pour une inscription manuelle) et le choix 2 (téléversement depuis l'édition).

## Limites connues

- **Description de la formation : non faite en riche.** Elle reste un texte brut. Passer en HTML demande aussi d'assainir la description côté backend (création, mise à jour, traductions) et de la rendre côté `learning` (qui l'affiche en texte brut, `whitespace-pre-line`). À traiter à part pour ne pas casser l'affichage existant.
- **Plusieurs fichiers par leçon** : non, un seul.
- **Médias abandonnés** : un onglet fermé en plein téléversement laisse un média UPLOADING qui compte dans le quota. Aucune purge planifiée.
- Le préfixe HLS d'une vidéo transcodée n'est pas supprimé du stockage à la suppression (seul l'original l'est).
- Le seuil de visionnage ne peut pas être effacé par l'API (un critère absent de la mise à jour est conservé).
- L'inscription manuelle n'envoie pas d'e-mail propre (notification d'activation uniquement, plus l'invitation si le compte est créé).
- Le refus hors plateforme n'envoie qu'une notification dans l'application, pas d'e-mail.
- Le quota `maxActiveLearners` n'est pas revérifié à la validation d'un paiement hors plateforme (existant).

## Vérification

- Backend : `tsc` OK sur les modules touchés (les erreurs restantes viennent d'autres chantiers : `audit`, `payments`, `users`), ESLint sans nouvel avertissement, `pnpm arch:check` sans violation, 51 suites et 402 tests OK sur enrollments, course-content, media, assessments, notifications, plans, shared. Nouveaux tests : MIME interdits (exécutable, zip, html, svg), quota de stockage (pile à la limite, un octet de plus, quota 0), taille maximale, abandon d'un média (409 hors UPLOADING et FAILED, 404 autre tenant), rattachement d'un média d'un autre tenant (404), mauvaise nature, média refusé ou en cours, URL http et `javascript:`, refus sans motif (aucune lecture ni écriture), refus d'une inscription active, refusée, terminée ou expirée (409, rien de sauvegardé ni notifié), inscription manuelle au-delà du quota (rien créé, personne invité), formation d'un autre tenant (404), compte gestionnaire refusé, double inscription, apprenant inconnu sans nom, gabarit `enrollment.refused`, tentatives d'examen (une requête pour les noms, 404 sans examen, pas de réponses).
- Business : `tsc`, ESLint sans erreur ni nouvel avertissement, 121 tests OK (assainisseur : script, iframe, gestionnaires d'événements, `javascript:`, `data:`, http, chevrons orphelins ; validation de fichier ; critère de consultation ; schémas d'inscription et de refus), `next build` OK.
- **Non testé** : envoi réel vers S3 (progression, annulation, CORS), transcodage réel, antivirus, rendu et comportement du clavier de l'éditeur Tiptap dans un navigateur, lecture au lecteur apprenant d'un média rattaché, e-mail d'invitation réel, envoi de la notification de refus en conditions réelles, routes HTTP de bout en bout (tests unitaires des cas d'usage seulement, pas de test d'intégration avec base de données).
