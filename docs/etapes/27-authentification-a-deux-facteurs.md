# Étape 27 — Authentification à deux facteurs (TOTP)

**Date** : 2026-11-18
**Référence cahier des charges** : sections 4.1 et 11 (2FA pour les administrateurs et les propriétaires d'entreprise), ADM-36, ENT-11.

Avant cette étape, les colonnes `twoFactorSecret` / `twoFactorEnabled` existaient dans `User` mais aucune logique ne les utilisait (écart « ABSENT » du rapport de conformité).

## Exigences traitées

- TOTP RFC 6238 (HMAC-SHA1, 6 chiffres, pas de 30 s, dérive ±1 pas), **sans nouvelle dépendance** (`node:crypto`), vérifié avec les vecteurs officiels des RFC 6238 et 4226.
- Obligatoire pour les comptes plateforme (`PLATFORM_ADMIN`) et le **Propriétaire d'entreprise** ; facultatif pour tous les autres (apprenants, gestionnaires, formateurs).
- Connexion en deux temps, enrôlement obligatoire à la première connexion suivant le déploiement, codes de récupération, désactivation et régénération protégées, réinitialisation par un autre administrateur, journal d'audit.

## Choix de conception (pris sans consultation, à valider)

1. **Défi = jeton opaque, pas un JWT.** 32 octets aléatoires, haché SHA-256 en base (table `two_factor_challenges`), 5 minutes, usage unique, ne porte que l'identité et sa finalité (`VERIFY` ou `ENROLL`). Comme ce n'est pas un JWT signé, la stratégie `passport-jwt` le rejette partout : un jeton d'enrôlement ne peut **pas** servir de Bearer sur une route normale, et il n'est accepté que par les 3 routes publiques de l'étape (`verify`, `enrollment/setup`, `enrollment/enable`).
2. **Forme de la réponse de `POST /auth/login`.** Sans 2FA ni obligation : inchangée (`{accessToken, refreshToken}`, donc `learning` n'est pas impacté). Sinon : `{ twoFactor: "VERIFY" | "ENROLL", challengeToken, expiresInSeconds }`, **sans aucun jeton**.
3. **Routes** : publiques `POST /auth/2fa/verify`, `POST /auth/2fa/enrollment/setup`, `POST /auth/2fa/enrollment/enable` (le défi prouve l'identité) ; authentifiées (Bearer) `GET /auth/2fa/status`, `POST /auth/2fa/setup`, `/enable`, `/disable`, `/recovery-codes` (activation volontaire et gestion). Le brief nommait `setup` et `enable` : j'ai doublé ces deux routes (variante « défi » sous `enrollment/`) plutôt que de faire accepter deux types d'identité à une même route publique.
4. **Les routes authentifiées n'exigent pas de permission de rôle** : ce sont des opérations sur son propre compte (l'identité vient du jeton, aucun identifiant en entrée). Elles portent `@SkipSubscriptionCheck()` (sécuriser son compte ne dépend pas de l'abonnement).
5. **Secret** chiffré AES-256-GCM (`secrets-cipher.ts`, `SECRETS_ENCRYPTION_KEY`), jamais relu après l'écran d'enrôlement. Un secret en attente (pas encore confirmé) est stocké avec `twoFactorEnabled = false` et peut être régénéré tant qu'il n'est pas confirmé ; une fois activée, la 2FA ne peut plus être re-`setup` (il faut la désactiver) : un défi ne peut donc pas écraser un secret actif.
6. **Anti-rejeu** : on mémorise le dernier pas accepté (`twoFactorLastStep`) ; tout code dont le pas est inférieur ou égal est refusé, même dans la fenêtre. L'écriture est conditionnelle (`updateMany where lastStep < pas`) : deux requêtes simultanées avec le même code ne passent pas toutes les deux. Conséquence assumée : après une connexion réussie, un nouveau code n'est accepté qu'au pas suivant (jusqu'à 30 s d'attente en cas de reconnexion immédiate).
7. **Verrouillage** : 5 échecs consécutifs (code faux, rejoué, ou code de récupération faux) → verrou de 15 minutes sur le compte ; **même un bon code est refusé pendant le verrou**. Un succès remet le compteur à zéro. Le verrou est par compte (et non par défi), donc relancer un défi ne le contourne pas. La limitation de débit par IP (10/min) s'ajoute.
8. **Codes de récupération** : 8 codes `XXXXX-XXXXX` (alphabet sans caractères ambigus, ≈ 50 bits, CSPRNG), hachés **argon2** (comme les mots de passe), affichés une seule fois, consommés atomiquement (`updateMany where usedAt null`), insensibles à la casse et au tiret. Leur usage est tracé (`auth.two-factor-recovery-used`).
9. **Désactivation** (`POST /auth/2fa/disable`) : mot de passe **puis** code ; **refusée avant toute autre vérification** (`2FA_OBLIGATOIRE`) si le compte est soumis à l'obligation. Régénération des codes : mot de passe + code, les anciens deviennent inutilisables.
10. **Obligation calculée à la connexion**, d'après le type de compte et le **nom du rôle** « Propriétaire d'entreprise » (constante dupliquée dans `auth/domain/two-factor.policy.ts`, un module ne pouvant pas importer le domaine d'un autre). Si ce rôle est renommé, la constante doit suivre. Les sessions déjà ouvertes ne sont pas coupées : l'enrôlement est exigé à la prochaine connexion (le rafraîchissement silencieux n'est pas soumis à la 2FA).
11. **Réinitialisation par un administrateur** : `POST /admin/users/:id/2fa/reset` (`admin-users.manage`, **aucune nouvelle permission**), placée dans le module auth (qui possède les données) sous le préfixe `admin/users`. Refusée sur soi-même (une session volée ne doit pas pouvoir effacer son propre second facteur) et sur un compte non plateforme. Efface secret, pas, verrou, codes et défis, **révoque les sessions** de la cible, émet `auth.two-factor-reset` (journal d'audit avec l'acteur). La cible devra s'enrôler de nouveau (obligatoire). Le **propriétaire d'entreprise** n'est pas réinitialisable par cette route (hors périmètre demandé).
12. **Frontaux** : le défi est gardé dans un **cookie httpOnly** (`admin_2fa_challenge` / `business_2fa_challenge`, `SameSite=Strict`, `path=/api/auth`, 5 min) : le JS du navigateur ne le voit jamais. Les cookies de session ne sont posés qu'**après** la vérification complète (`/api/auth/2fa/verify`) ou la confirmation d'enrôlement. Pour l'enrôlement, la confirmation vaut vérification : elle ouvre la session côté serveur et ne renvoie au navigateur que les codes de récupération.

## Backend (`backend/src/modules/auth/`)

| Fichier | Rôle |
| --- | --- |
| `domain/totp.ts`, `base32.ts` | HOTP/TOTP, secret 160 bits, fenêtre ±1, anti-rejeu, comparaison à temps constant (`timingSafeEqual`, les 3 candidats toujours comparés), URI `otpauth://` |
| `domain/recovery-codes.ts`, `two-factor.policy.ts`, `two-factor.errors.ts`, `two-factor.repository.port.ts` | codes de récupération, règle d'obligation, constantes (5 min, 5 échecs, 15 min), erreurs typées, ports |
| `application/two-factor-challenge.service.ts`, `two-factor-code-verifier.service.ts` | défis, vérification d'un code (TOTP/récupération, verrou) |
| `application/two-factor-login.use-cases.ts`, `two-factor-settings.use-cases.ts` | vérification à la connexion, enrôlement, activation, désactivation, régénération, état, réinitialisation |
| `application/login.use-case.ts`, `token.service.ts` | `login` renvoie un défi si 2FA active/obligatoire ; `issueForUser` |
| `infrastructure/two-factor.prisma-repository.ts`, `qr-code.generator.ts`, `auth.prisma-repository.ts` | persistance, QR code (dépendance `qrcode` existante), `findById` |
| `presentation/two-factor.controller.ts`, `admin-two-factor.controller.ts`, `dto/two-factor.dto.ts` | routes ; DTO stricts (défi = 64 caractères hexadécimaux, code ≤ 16 caractères alphanumériques) |
| `auth.events.ts`, `audit/application/audit-sensitive-events.listener.ts` | événements `auth.two-factor-enabled/disabled/reset/recovery-used` journalisés (jamais de secret ni de code) |
| `prisma/schema.prisma` | `User` : `twoFactorEnabledAt`, `twoFactorLastStep`, `twoFactorFailedAttempts`, `twoFactorLockedUntil` ; modèles `TwoFactorRecoveryCode`, `TwoFactorChallenge` |

## Administration (`admin/src/`) et entreprise (`business/src/`)

Mêmes fichiers dans les deux applications (duplication volontaire) : `lib/two-factor-challenge.ts`, `lib/two-factor-proxy.ts`, routes `app/api/auth/2fa/{verify,enrollment/setup,enrollment/enable}`, `app/api/auth/login/route.ts` (renvoie l'étape suivante, pose le cookie de défi), `features/auth/components/{TwoFactorVerifyForm,TwoFactorEnrollment,TotpSetupPanel,RecoveryCodesPanel}.tsx` (étape code avec bascule vers un code de récupération ; enrôlement obligatoire avec QR, clé en clair, confirmation, affichage unique des codes avec copie/téléchargement, bouton de poursuite bloqué tant que les codes ne sont pas copiés ou téléchargés), `features/auth/schemas/two-factor.schema.ts`, `features/security/` et la page **« Sécurité du compte »** (`/security`, entrée du menu). Le proxy tenant-aware de `business` rejoue le `Host` du sous-domaine. Admin seulement : action **« Réinitialiser la 2FA »** dans la liste des comptes administrateurs (confirmation, masquée sur son propre compte).

## Actions à mener

1. **Définir `SECRETS_ENCRYPTION_KEY` AVANT de déployer** (ajouté, avec `TOTP_ISSUER`, à `backend/.env.example`). Sans elle, l'enrôlement échoue et les administrateurs/propriétaires ne peuvent **plus se connecter**.
2. **Schéma** : appliquer `prisma/schema.prisma` à la base (le projet n'utilise pas de migrations : `prisma db push` ou équivalent), puis `prisma generate`.
3. Prévenir les administrateurs et propriétaires : à la prochaine connexion, ils devront installer une application d'authentification et conserver leurs 8 codes de récupération.
4. **Procédure de secours** si le dernier administrateur perd son appareil et ses codes (personne ne peut le réinitialiser) : exécuter en base la remise à zéro de ses colonnes `two_factor_*` et la suppression de ses lignes `two_factor_recovery_codes` ; il se ré-enrôlera à la connexion. Aucun outil en ligne de commande n'est fourni.

## Limites connues

- **`learning` non adapté** : un apprenant qui activerait volontairement la 2FA (via l'API, il n'existe pas d'écran dans `learning`) recevrait la réponse « défi » à la connexion et ne pourrait pas se connecter depuis `learning`. Les apprenants sans 2FA ne voient aucune différence.
- Les comptes soumis à l'obligation ne sont pas déconnectés au déploiement ; le rafraîchissement silencieux d'une session existante ne repasse pas par la 2FA.
- La désactivation et la régénération avec un **code de récupération** sont acceptées à la place du TOTP (utile si l'appareil est perdu) ; ce code est alors consommé.
- Pas d'e-mail de notification lors d'une activation, d'une désactivation, d'un usage de code de récupération ou d'une réinitialisation (seulement le journal d'audit).
- Un propriétaire d'entreprise qui perd son appareil ne peut pas être réinitialisé depuis l'Admin (route limitée aux comptes plateforme).
- La limitation de débit repose sur le limiteur global par IP existant ; pas de verrouillage progressif au-delà des 15 minutes.
- L'obligation du propriétaire dépend du **nom** du rôle (voir choix 10).
- Le mot de passe n'est pas redemandé pour une activation volontaire (seulement pour la désactivation et la régénération).
- Les échecs de mot de passe à la connexion restent gérés comme avant (pas de verrou, hors périmètre).

## Vérification

- Backend : `tsc` OK, ESLint sans avertissement sur `modules/auth` et le listener d'audit, **65 tests** du module auth OK : vecteurs RFC 4226 (annexe D) et RFC 6238 (annexe B, 6 vecteurs SHA-1 à 8 chiffres), Base32 RFC 4648, fenêtre ±1 acceptée et ±2 refusée, rejeu refusé, formats invalides, comparaison à temps constant, URI `otpauth`, secret 160 bits ; connexion (réponse inchangée sans 2FA, défi `ENROLL` pour un admin et un propriétaire mais pas un gestionnaire, défi `VERIFY` si 2FA active, aucun défi sans bon mot de passe) ; enrôlement (secret chiffré en base, 8 codes hachés argon2, défi consommé et rejeu refusé, confirmation sans setup ou avec un mauvais code refusée, défi de la mauvaise finalité refusé, défi expiré ou inconnu refusé, compte suspendu refusé, re-setup d'une 2FA active refusé) ; vérification (défi réutilisé refusé, code rejoué refusé, verrouillage après 5 échecs même avec le bon code puis levée du verrou, compteur remis à zéro, code de récupération à usage unique et tracé, code inventé refusé) ; désactivation refusée pour admin et propriétaire, permise pour un apprenant avec mot de passe et code, régénération invalidant les anciens codes ; réinitialisation (efface tout, révoque les sessions, journalise l'acteur, refusée sur soi-même / compte non plateforme / inconnu).
- `pnpm arch:check` : aucune violation dans le module auth. **Une violation existe ailleurs** (`platform-settings/application/finance-settings.use-cases.spec.ts` → `presentation`), hors de cette étape, non corrigée.
- Admin : `tsc`, ESLint OK ; 62 tests OK (8 nouveaux sur les schémas, le fichier de codes et l'URL du QR). Business : `tsc`, ESLint OK ; 63 tests OK (mêmes 8).
- **Non testé** : parcours complet dans un navigateur (connexion, QR scanné avec une vraie application d'authentification, copie dans le presse-papiers, téléchargement), appel réel des routes HTTP (guards, DTO, en-têtes de limitation de débit), persistance réelle Prisma (les tests utilisent un dépôt en mémoire qui reproduit les écritures conditionnelles : la sémantique réelle des `updateMany` n'est pas exercée), cookies httpOnly côté Next.js, proxy tenant-aware de `business` avec de vrais sous-domaines, action de réinitialisation dans l'interface d'administration, effet du rejeu concurrent réel sur une base.
