# Étape 09 — Mot de passe oublié

**Date** : 2026-11-17
**Référence cahier des charges** : PUB-04 (compte apprenant : « mot de passe oublié »). Le même mécanisme sert aux comptes du back-office Entreprise et du back-office Admin.

## Audit qui a motivé l'étape

Comparaison du cahier des charges avec le code : la réinitialisation de mot de passe n'existait ni côté backend ni côté fronts. Autres écarts constatés, **non traités ici** :

| Zone | Écart (MVP sauf mention) |
| --- | --- |
| Admin | Supervision globale : formations (ADM-29), apprenants (ADM-30), registre des certificats (ADM-31), transactions de tous les paiements (ADM-32) ; consommation IA et santé technique (ADM-34/35, V1) ; paramètres plateforme : intégrations, modèles d'e-mails, modèles de certificats, langues, pages légales (ADM-37 à 41). |
| Apprenant | Historique d'achats (PUB-18) ; profil (PUB-04) ; langue de l'interface (PUB-15), qualité vidéo adaptative (PUB-16), langue du contenu des formations (PUB-17). |
| **Back-offices Admin et Entreprise** | **Aucune page `/activate`** : le lien d'invitation (`https://admin.…/activate`, `https://<slug>-backoffice.…/activate`) mène à une page inexistante. Seule l'app apprenant a cette page. À corriger en priorité, c'est le même formulaire que la réinitialisation. |

## Parcours

1. « Mot de passe oublié ? » sous le formulaire de connexion → page `/forgot-password` → saisie de l'e-mail.
2. Le backend envoie un lien `/reset-password?token=…` **vers la surface propre à l'utilisateur** (admin, back-office de son entreprise, ou site apprenant), valable **1 heure**.
3. Page `/reset-password` : nouveau mot de passe + confirmation → retour à la connexion.

## Backend

| Fichier | Rôle |
| --- | --- |
| `users/application/password-reset.use-cases.ts` | `RequestPasswordResetUseCase`, `ResetPasswordUseCase`. |
| `users/presentation/password-reset.controller.ts` + DTO | `POST /auth/forgot-password` (5/min/IP), `POST /auth/reset-password` (10/min/IP), routes publiques. |
| `users/users.events.ts` | Événements publics `PasswordResetRequestedEvent`, `PasswordChangedEvent`. |
| `auth/application/revoke-sessions-on-password-change.listener.ts`, `auth.repository.port.ts`, `auth.prisma-repository.ts` | Ferme tous les jetons de rafraîchissement après un changement de mot de passe. |
| `notifications/application/password-reset-requested.listener.ts`, gabarit `user.password-reset` (fr/en), `activation-url.ts` (paramètre `path`) | E-mail avec le lien dédié. |

### Règles de sécurité

- **Pas d'énumération de comptes** : `forgot-password` répond toujours `{ accepted: true }`, que l'e-mail existe, soit mal formé, ou que le compte soit invité, suspendu ou désactivé. Les fronts relaient ce même comportement et n'exposent jamais le détail du backend.
- Seul un compte **actif** reçoit un lien. Un compte suspendu ou désactivé **après** la demande ne peut pas utiliser son lien.
- Le lien est **à usage unique**, haché en base (jamais stocké en clair), et une nouvelle demande invalide le précédent. Il réutilise la table des jetons d'invitation existante (aucun changement de schéma).
- Après changement, **toutes les sessions sont fermées** (jetons de rafraîchissement révoqués). Les jetons d'accès déjà émis expirent d'eux-mêmes sous 15 minutes.
- Isolation par entreprise : l'e-mail est cherché dans l'entreprise de la surface appelante (ou parmi les comptes plateforme sur la surface admin).

## Fronts (chacun autonome, aucun fichier partagé)

- `learning` : `ForgotPasswordForm`, `ResetPasswordForm`, pages `(auth)/forgot-password` et `(auth)/reset-password`, proxys `api/auth/forgot-password` et `api/auth/reset-password`, textes dans `lib/copy.ts`, lien sur la page de connexion.
- `business` et `admin` : mêmes éléments, copiés dans chaque app (formulaires, schéma, API, proxys, pages, lien dans `LoginForm`), pages ajoutées aux chemins publics du middleware. Le proxy `business` transmet l'hôte de l'entreprise ; celui d'`admin` annonce la surface admin.

## Limites connues

- Le mot de passe saisi n'est contrôlé que sur la longueur (8 à 128 caractères), comme à l'activation ; pas de règle de complexité.
- Pas de notification « votre mot de passe a été modifié » envoyée à l'utilisateur.
- Les jetons d'accès (15 min) déjà émis restent valides jusqu'à leur expiration.
- Un compte `INVITED` qui a perdu son lien d'activation n'est pas servi par ce parcours (voir l'écart sur `/activate` ci-dessus).

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 75 suites / 482 tests OK. Nouveaux tests : lien émis pour un compte actif avec hachage et durée ≤ 1 h, rien d'émis (ni erreur) pour un compte invité, suspendu, désactivé, inconnu ou mal formé, mot de passe haché (argon2) et lien consommé, refus d'un lien inconnu, déjà utilisé, expiré ou d'un compte suspendu, URL et gabarit.
- `learning`, `business`, `admin` : `tsc` et ESLint OK ; tests existants OK (admin 30, business 27).
- **Non testé** : envoi réel de l'e-mail, parcours dans le navigateur, base de données. Aucun test automatisé n'exerce les proxys Next.js ni les formulaires.
