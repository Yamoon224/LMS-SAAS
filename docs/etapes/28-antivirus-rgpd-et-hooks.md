# Étape 28 — Antivirus des uploads, RGPD / loi 2013-450 et hooks Git

**Date** : 2026-11-18
**Référence cahier des charges** : section 4.1 (Media) et section 11 (sécurité, protection des données) ; qualité de dépôt (Husky, lint-staged, commitlint).

## Exigences

1. Analyser les fichiers téléversés par un antivirus **avant** tout transcodage ou mise à disposition (les fichiers vont directement à S3 par URL présignée : le backend ne les voit pas).
2. Respecter la loi ivoirienne 2013-450 pour les apprenants : export de ses données, suppression du compte, durées de conservation, registre des traitements.
3. Faire fonctionner les hooks Git annoncés par `package.json` (le dossier `.husky` n'existait pas).

## Choix pris sans consultation (à valider)

### Antivirus

1. **ClamAV via clamd, protocole INSTREAM sur TCP**, écrit avec `node:net` (aucune dépendance ajoutée). Configuré par `CLAMAV_HOST` / `CLAMAV_PORT`.
2. **L'analyse se fait après la confirmation de l'upload, en arrière-plan** : `POST business/media/:id/confirm` passe l'asset à `SCAN_PENDING` et répond aussitôt ; l'analyse relit le fichier depuis le stockage (`openObject`), puis lance le transcodage (vidéo) ou marque l'asset prêt. Le client suit l'état par le nouveau `GET business/media/:id` (statut, motif générique).
3. **Fichier infecté** : supprimé du stockage, asset `REJECTED` (état terminal) avec le motif générique « Fichier refusé par l'analyse de sécurité. », événement `media-asset.rejected` (journal d'audit `media.rejected`, avec un code de motif seulement). **Le nom du virus n'apparaît que dans les journaux serveur**, jamais dans l'API ni l'audit.
4. **Fichier trop gros pour l'analyse** (au-delà de `CLAMAV_MAX_SCAN_BYTES`, 100 Mo par défaut, ou « size limit exceeded » renvoyé par clamd) : traité comme refusé (supprimé, `REJECTED`, motif « trop volumineux pour l'analyse de sécurité »). Choix prudent : un fichier non analysable n'est pas servi. Il faut aligner `StreamMaxLength` de clamd sur `CLAMAV_MAX_SCAN_BYTES`.
5. **Scanner indisponible** (connexion refusée, coupure, délai dépassé, réponse inattendue y compris `ERROR`) : l'asset **reste `SCAN_PENDING`**, n'est jamais servi (`isReady()` est faux), et la tâche planifiée `MediaScheduler` (toutes les 5 minutes, 20 assets par passage) retente. Aucune limite de tentatives : un asset peut rester en attente tant que le scanner est en panne.
6. **Objet absent du stockage** à l'analyse (confirmation sans PUT réel) : l'asset passe `FAILED` (« Le fichier n'a pas été reçu par le stockage »).
7. **Sans `CLAMAV_HOST`** : analyse **désactivée**, avertissement journalisé à chaque asset, l'asset est publié sans analyse (développement). Avec **`MEDIA_SCAN_REQUIRED=true`** (à positionner en production), l'asset reste `SCAN_PENDING` et une erreur est journalisée : rien n'est servi sans analyse.
8. Délais : inactivité de la connexion 15 s (`CLAMAV_IDLE_TIMEOUT_MS`), durée totale 5 min (`CLAMAV_TOTAL_TIMEOUT_MS`).

### RGPD

9. **Nouveau module `privacy`** qui lit et écrit directement les tables Prisma (même précédent que `analytics`) : l'export et l'anonymisation traversent par nature plusieurs modules et doivent être atomiques. `arch:check` passe.
10. **Export** `GET /public/me/data-export` : profil, inscriptions, progression, tentatives (réponses comprises), certificats, achats et remboursements, acceptations légales, présences aux sessions en direct, notifications. **Exclus** : haché de mot de passe, secret 2FA, jetons, `rawPayload` des prestataires de paiement, **contenu des notifications** (peut contenir des liens d'activation ou de réinitialisation à usage unique : seuls canal, modèle, statut et dates sont exportés). Limité à 3 appels par minute. Toutes les requêtes sont bornées par l'identifiant tiré du jeton ; aucun identifiant n'est accepté en entrée.
11. **Suppression** `POST /public/me/delete-account` `{ password }` : réservée aux comptes `LEARNER`. Mot de passe vérifié (Argon2), limité à 5 appels par minute. **Anonymisation irréversible** en une transaction : nom → « Compte supprimé », e-mail → `deleted-<uuid>@anonymized.invalid` (dérivé du seul identifiant interne : aucune trace de l'ancienne adresse, qui devient réutilisable pour un nouveau compte et ne peut plus se connecter), téléphone, mot de passe et secret 2FA effacés, statut `DEACTIVATED`, `anonymizedAt` renseigné, sessions révoquées, jetons d'activation supprimés, notifications supprimées.
12. **Conservé** : paiements, remboursements, grand livre, inscriptions, progression et résultats (désormais sans identité), acceptations légales (preuve de consentement, sans identité), **certificats : numéro, statut et score conservés ; le nom du titulaire enregistré en base est remplacé par « Compte supprimé »** (la vérification publique l'affiche donc ainsi ; une réémission afficherait aussi « Compte supprimé »). **Le PDF déjà émis n'est pas réécrit.**
13. **Refus motivé** (400, code `SUPPRESSION_COMPTE_BLOQUEE`) tant qu'un paiement du compte est `PENDING` ou qu'une demande de remboursement est `REQUESTED`/`ACCEPTED` (il n'existe pas de statut « litige » dans le modèle : c'est l'interprétation retenue). Les reversements (`Payout`) concernent l'entreprise, pas l'apprenant : aucun contrôle spécifique. Mauvais mot de passe : 400 `MOT_DE_PASSE_INCORRECT` ; double suppression : 400 `COMPTE_DEJA_SUPPRIME` (le jeton d'accès reste valable jusqu'à 15 minutes).
14. **Conservation** : tâche `PrivacyScheduler` (03 h 30 UTC) : notifications **lues** de plus de 12 mois supprimées ; comptes apprenants **inactifs depuis 36 mois** anonymisés (100 par passage, ceux avec paiement/remboursement en cours sont repris plus tard). Constantes dans `privacy-policy.ts` ; `RETENTION_PURGE_ENABLED=false` désactive. **Définition de l'inactivité** : `lastLoginAt` n'est jamais renseigné par le code actuel (aucune écriture trouvée) ; l'inactivité se mesure donc par l'absence de session créée (connexion ou rafraîchissement) et d'inscription modifiée depuis 36 mois, et un compte plus récent que 36 mois n'est jamais touché.
15. **Permission** : les deux routes réutilisent `learner.view-own-enrollments` (déjà donnée à tous les apprenants) : aucune nouvelle permission à distribuer aux rôles existants.
16. Événements d'audit : `privacy.data-exported` (nombres seulement), `privacy.account-deleted` (origine `SELF` ou `RETENTION`), `privacy.expired-data-purged`.

### Hooks Git

17. `.lintstagedrc.cjs` (remplace la clé `lint-staged` de `package.json`, qui ne lançait que Prettier) : **ESLint `--fix` puis Prettier** sur les fichiers indexés. Chaque composant ayant sa propre configuration ESLint, ESLint est lancé depuis le dossier du composant (`pnpm --dir <composant> exec eslint --fix --no-warn-ignored …`), puis Prettier depuis la racine. JSON, Markdown, CSS et YAML : Prettier seul.
18. `.husky/pre-commit` → `pnpm exec lint-staged` ; `.husky/commit-msg` → `pnpm exec commitlint --edit "$1"` (configuration existante `commitlint.config.cjs`, Conventional Commits avec liste de portées).

## Fichiers

**Backend — media** (`backend/src/modules/media/`)
- `domain/malware-scanner.port.ts` (port, verdicts, erreur d'indisponibilité), `domain/media-asset-status.ts` (`SCAN_PENDING`, `REJECTED`), `domain/media-asset.entity.ts` (`markScanPending`, `reject`), `domain/object-storage.port.ts` (`openObject`, `StorageObjectNotFoundError`), `domain/media-asset.repository.port.ts` (`listScanPending`)
- `infrastructure/clamav-malware-scanner.adapter.ts` (INSTREAM) ; `infrastructure/s3-object-storage.adapter.ts` (`openObject`) ; `infrastructure/media-asset.prisma-repository.ts`
- `application/scan-uploaded-asset.use-case.ts`, `application/confirm-upload.use-case.ts` (remanié), `application/get-media-asset-status.use-case.ts`
- `media.scheduler.ts`, `media.events.ts` (`MediaAssetRejectedEvent`), `media.module.ts`, `presentation/business-media.controller.ts` (`GET :mediaAssetId`)
- Audit : `backend/src/modules/audit/application/audit-sensitive-events.listener.ts` (4 nouveaux écouteurs)

**Backend — privacy** (`backend/src/modules/privacy/`) : `domain/` (politique, identité anonymisée, export, erreurs, port), `application/` (export, suppression, purge), `infrastructure/privacy.prisma-repository.ts`, `presentation/public-privacy.controller.ts` + `dto/delete-account.dto.ts`, `privacy.scheduler.ts`, `privacy.events.ts`, `privacy.module.ts` (enregistré dans `app.module.ts`).

**Prisma** (`backend/prisma/schema.prisma`, éditions ciblées, **pas de migration**) : `MediaAssetStatus` + `SCAN_PENDING`, `REJECTED` ; `User.anonymizedAt`.

**Configuration** : `.env.example` et `backend/.env.example` (`CLAMAV_*`, `MEDIA_SCAN_REQUIRED`, `RETENTION_PURGE_ENABLED`).

**Learning** : `features/profile/components/MyDataSection.tsx` (intégrée à `ProfilePage.tsx`), `features/profile/api/my-data.api.ts`, `features/profile/lib/deletion-error.ts` (+ test), clé `myData` dans les **huit** dictionnaires (`lib/i18n/dictionaries/*.ts`).

**Documentation et outillage** : `docs/registre-des-traitements.md`, `.lintstagedrc.cjs`, `.husky/pre-commit`, `.husky/commit-msg`, `package.json` (clé `lint-staged` retirée).

## Actions à mener

1. **Appliquer le schéma** à la base (`prisma db push` ou la procédure de l'équipe) : sans cela, `SCAN_PENDING`, `REJECTED` et `users.anonymized_at` n'existent pas.
2. **Déployer clamd** (image `clamav/clamav`), renseigner `CLAMAV_HOST`/`CLAMAV_PORT`, aligner `StreamMaxLength` de `clamd.conf` sur `CLAMAV_MAX_SCAN_BYTES`, et mettre **`MEDIA_SCAN_REQUIRED=true` en production**. Vérifier les mises à jour des signatures (freshclam).
3. **Après un `git init` ou un clone** : lancer `pnpm install` (ou `pnpm prepare`) pour que Husky configure `core.hooksPath` ; les droits d'exécution des fichiers de `.husky` sont gérés par Husky 9.
4. **Faire valider `docs/registre-des-traitements.md` par un juriste** (qualification des rôles, durée comptable, transferts hors Côte d'Ivoire, ARTCI) et compléter la politique de confidentialité publiée.
5. Si Docker Compose doit fournir un clamd en local : ajouter le service (non fait, le comportement sans `CLAMAV_HOST` permet de développer).

## Limites connues

- **Aucune vérification contre un vrai clamd ni un vrai S3/PostgreSQL** : le protocole est testé contre un faux serveur TCP local ; le repository Prisma est testé contre un Prisma factice (portée par `userId`, champs exclus, transaction). Les requêtes Prisma n'ont jamais été exécutées sur une base.
- **Course possible entre instances** : le verrou anti-double analyse est en mémoire (un seul processus). Avec plusieurs instances, une analyse pourrait être faite deux fois (un transcodage lancé deux fois est le pire cas).
- **Fichier infecté dont la suppression S3 échoue** : l'asset est refusé (jamais servi) mais l'objet reste dans le bucket ; erreur journalisée, nettoyage manuel.
- **Assets créés avant cette étape** et déjà `READY` ne sont pas analysés rétroactivement.
- **Le PDF de certificat déjà émis conserve le nom** du titulaire (le fichier n'est pas régénéré) ; seule la vérification publique et la base sont anonymisées.
- **Journal d'audit** : les entrées existantes référencent l'identifiant (pas le nom) mais peuvent contenir adresse IP et agent utilisateur ; non purgées. **Charge brute des paiements** (`rawPayload`) conservée telle quelle (obligation comptable).
- **Opposition / limitation** et **rectification de l'e-mail** non automatisées.
- **Écran business** : aucun écran d'état des médias n'existe encore dans `business` (un autre agent construit l'upload) ; seul le statut est exposé par l'API (`GET business/media/:id` : `SCAN_PENDING` = analyse en cours, `REJECTED` = refusé + motif générique). L'écran devra afficher ces états.
- **Traductions `myData` non relues par des locuteurs natifs** (produites par IA, vérification de forme seulement).
- **Hooks** : jamais exécutés (pas de dépôt Git) ; la cohérence a été vérifiée par lecture et par chargement du `.lintstagedrc.cjs` dans Node. Prettier, appliqué aux fichiers indexés, peut reformater des fichiers entiers existants (largeur 100) lors du premier commit de chacun. `prettier-plugin-tailwindcss` (requis par `.prettierrc.json`) n'est pas déclaré à la racine : il dépend du hissage de pnpm (présent dans `node_modules` ici) ; à déclarer à la racine si Prettier échoue sur une installation propre.

## Vérifications faites

- `tsc --noEmit` : aucune erreur dans `media`, `privacy`, `audit`, `app.module` (backend) ni dans `features/profile` (learning). Des erreurs existent ailleurs (pages de cours de `learning`, specs `users`) et viennent d'autres travaux en parallèle : non corrigées.
- ESLint : zéro erreur. Un avertissement de taille préexistant (`request-upload.use-case.spec.ts`), aucun nouveau.
- `pnpm arch:check` : aucune violation (917 modules).
- Jest : `media` 70 tests (dont 12 pour le scanner contre un faux clamd : `stream: OK`, `Eicar-Test-Signature FOUND`, `INSTREAM size limit exceeded`, limite locale, connexion coupée, port fermé, silence/délai, réponse `ERROR`, erreur du flux source ; 12 pour le cas d'usage : infecté, trop gros, scanner coupé, objet absent, suppression S3 en échec, non configuré avec/sans `MEDIA_SCAN_REQUIRED`, double analyse parallèle) ; `privacy` 23 tests (suppression : nominal, mauvais mot de passe, compte sans mot de passe, double suppression et course, paiement en attente, remboursement ouvert, compte non apprenant ; export : portée du demandeur, aucun secret sélectionné, compte anonymisé ; purge : durées, désactivation, comptes bloqués, course ; anonymisation : identité irréversible, transaction complète, aucune autre écriture si déjà anonymisé).
- Vitest `learning` : 109 tests, dont le nouveau test des messages de suppression et la complétude des huit dictionnaires (clé `myData`).

## Vérifications non faites

- Aucun test avec un vrai clamd/EICAR, ni sur une vraie base (réutilisabilité effective de l'ancien e-mail, connexion refusée après anonymisation : garanties par construction — l'e-mail est remplacé et le haché effacé — mais pas exécutées de bout en bout).
- Écran « Mes données » jamais affiché dans un navigateur (téléchargement du fichier, panneau de confirmation, rendu RTL).
- `next build`, E2E et exécution réelle de Husky/lint-staged/commitlint.
