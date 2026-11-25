# Étape 10 — Pages d'activation des back-offices

**Date** : 2026-11-17
**Référence** : ADM-05 / ENT-10 (accès envoyés par e-mail à un nouvel administrateur ou utilisateur d'entreprise). Corrige l'écart relevé à l'étape 09.

## Problème

Le backend envoie bien un lien d'activation (`https://admin.<domaine>/activate?token=…` pour un administrateur, `https://<slug>-backoffice.<domaine>/activate?token=…` pour un utilisateur d'entreprise), mais `admin` et `business` n'avaient **aucune page `/activate`** : seule l'app apprenant en avait une. Un administrateur ou un propriétaire d'entreprise invité ne pouvait donc jamais définir son mot de passe.

## Changements (copiés dans chacune des deux apps, aucun fichier partagé)

| Fichier | Rôle |
| --- | --- |
| `src/app/(auth)/activate/page.tsx` | Page « Activez votre compte ». |
| `src/features/auth/components/ActivateForm.tsx` | Mot de passe + confirmation ; message clair si le jeton manque dans l'URL ; retour à `/login` en cas de succès. |
| `src/features/auth/api/activate.api.ts` | Appel du proxy local (jamais le backend depuis le navigateur). |
| `src/app/api/auth/activate/route.ts` | Proxy vers `POST /v1/auth/activate` (route publique existante). `business` transmet l'hôte de l'entreprise, `admin` annonce la surface admin. Le détail d'erreur du backend n'est pas relayé. |
| `src/middleware.ts` | `/activate` ajouté aux chemins publics. |

Le schéma de mot de passe (8 à 128 caractères, confirmation identique) est celui de l'étape 09 (`password-reset.schema.ts`), propre à chaque app. Aucun changement backend.

## Limites connues

- Un lien expiré ou déjà utilisé affiche un message demandant un nouvel envoi à l'administrateur ; il n'y a pas de bouton « renvoyer le lien » côté invité (le renvoi se fait depuis la gestion des utilisateurs).
- Le mot de passe n'est contrôlé que sur la longueur.

## Vérification

- `admin` : `tsc`, ESLint OK, 30 tests OK. `business` : `tsc`, ESLint OK, 27 tests OK. Aucun changement backend, donc pas de nouvelle exécution de ses tests.
- **Non testé** : parcours réel dans le navigateur avec un vrai lien d'invitation. Aucun test automatisé n'exerce le formulaire ni le proxy.
