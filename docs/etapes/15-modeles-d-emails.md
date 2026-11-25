# Étape 15 — Modèles d'e-mails modifiables

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-38 — modèles multilingues (bienvenue, échec de paiement…). Deuxième fonction de paramétrage plateforme (section 5.6).

## Principe

Les 13 textes d'origine restent dans le code (français et anglais). L'Admin peut **remplacer le sujet et le contenu d'un modèle pour une langue** avec la syntaxe `{{variable}}`. Absence de modification = texte d'origine ; « Revenir au texte d'origine » supprime la modification. Au moment de l'envoi, la modification de la langue du destinataire prime ; sinon le texte d'origine est envoyé.

## Garde-fous (fonctions pures, testées)

- **Variables connues seulement** : chaque modèle déclare ses variables (`firstName` toujours, plus `amount`, `courseTitle`, `resetUrl`…). Une variable inconnue est refusée et nommée dans le message.
- **Variables vitales obligatoires dans le contenu** : `{{activationUrl}}` (invitation), `{{resetUrl}}` (réinitialisation), `{{downloadUrl}}` (certificat), `{{meetLink}}` (session live). Sans elles, le message serait inutilisable et casserait un parcours.
- **Sujet sur une seule ligne** : un saut de ligne permettrait d'injecter des en-têtes d'e-mail (ex. `Bcc:`).
- Tailles bornées (200 caractères pour le sujet, 10 000 pour le contenu).
- **Aucune évaluation de code** : le rendu remplace uniquement les marqueurs ; une valeur contenant `{{...}}` n'est pas réinterprétée.
- Un test vérifie que **chaque texte d'origine respecte lui-même ces règles** et ne contient que des variables déclarées : on ne peut pas ajouter un modèle au code en oubliant de le déclarer.

## Backend (`backend/src/modules/notifications/`)

| Fichier | Rôle |
| --- | --- |
| `domain/template-overrides.ts` (+ spec) | Variables, règles de validation, interpolation, marqueurs pour afficher le texte d'origine. |
| `domain/template-override.repository.port.ts`, `infrastructure/template-override.prisma-repository.ts` | Persistance (une ligne par modèle et par langue). |
| `application/manage-notification-templates.use-cases.ts` (+ spec) | Lister (texte d'origine, texte actuel, variables), enregistrer, rétablir. |
| `application/send-notification.use-case.ts` | Rendu : modification de l'Admin si elle existe pour la langue, sinon texte d'origine. |
| `presentation/admin-notification-templates.controller.ts` | `GET /admin/notification-templates`, `PUT` et `DELETE /admin/notification-templates/:templateKey/:locale`. |

### Modèle de données et permission — à appliquer

- `prisma/schema.prisma` : table `notification_template_overrides` (unique par modèle et langue) → `prisma db push`. Le client Prisma est déjà régénéré ici.
- Nouvelle permission plateforme **`notification-templates.manage`** (Super Administrateur) → `pnpm db:backfill-roles` pour les comptes existants.

## Front Admin (`admin/features/notification-templates/`)

Page `/notification-templates` (menu « Plateforme ») : une carte par modèle avec ses deux langues, badge « Personnalisé », date de modification ; boîte de dialogue d'édition avec rappel des variables (les obligatoires sont marquées), validation avant envoi, et retour au texte d'origine.

## Limites connues

- Seuls le **français et l'anglais** sont modifiables : ce sont les seules langues pour lesquelles des textes d'origine existent. Un destinataire dans une autre langue reçoit le texte français d'origine (comportement antérieur inchangé).
- Les modifications s'appliquent aux **e-mails et SMS**. Les notifications **dans l'application** de l'apprenant ont leurs propres textes côté `learning`, non modifiables ici.
- Une modification s'applique à toute la plateforme (pas de personnalisation par entreprise) et n'est pas versionnée : seul le texte actuel et sa date sont conservés.
- Pas d'aperçu avec des données réelles ni d'envoi de test.
- Le contenu est du texte brut : pas de mise en forme HTML.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 83 suites / 544 tests OK. Nouveaux : 29 (règles de validation dont l'injection d'en-têtes et les variables vitales, cohérence avec les 13 textes d'origine, liste, enregistrement refusé sans écriture, retour au texte d'origine, **envoi avec modification prioritaire et repli sur le texte d'origine**).
- Admin : `tsc`, ESLint OK, 30 tests OK.
- **Non testé** : envoi réel d'un e-mail modifié, exécution des requêtes sur une vraie base, affichage dans le navigateur.
