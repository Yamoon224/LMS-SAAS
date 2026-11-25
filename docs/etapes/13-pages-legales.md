# Étape 13 — Pages légales versionnées

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-41 — CGU / CGV plateforme et politique de confidentialité, « versionnées avec acceptation tracée ». Première des fonctions de paramétrage plateforme (section 5.6) traitée.

## Règles métier (fonctions pures, testées)

- Trois types : CGU, CGV, politique de confidentialité. Chaque type a des versions numérotées 1, 2, 3… (la suivante dépasse toujours la plus haute existante).
- Une version est un **brouillon** tant qu'elle n'est pas publiée ; elle ne peut être publiée que si titre et contenu sont non vides.
- Une version **publiée est immuable** : pour la corriger, on crée une nouvelle version. La garde existe dans le domaine **et** dans la requête SQL (la mise à jour ne vise que `publishedAt = null`).
- La **version courante** d'un type est sa plus récente version publiée ; un brouillon n'est jamais servi au public.
- L'acceptation est tracée par version précise (un enregistrement par utilisateur et par version, horodaté, idempotent).

## Backend — nouveau module `backend/src/modules/legal/`

| Fichier | Rôle |
| --- | --- |
| `domain/legal-document.ts` (+ spec) | Types, numérotation, garde d'édition et de publication, version courante. |
| `application/legal.use-cases.ts` (+ spec) | Créer un brouillon, le modifier, le publier, lister, lire la version courante, tracer une acceptation. |
| `infrastructure/legal.prisma-repository.ts` | Persistance ; la contrainte unique (type, version) rejette deux créations simultanées du même numéro. |
| `presentation/admin-legal.controller.ts` | `GET/POST /admin/legal`, `PUT /admin/legal/:id`, `POST /admin/legal/:id/publish` (permission `legal.manage`). |
| `presentation/public-legal.controller.ts` | `GET /public/legal/:type` (public) et `POST /public/legal/:type/accept` (apprenant connecté). |

### Modèle de données et permissions — à appliquer

- `prisma/schema.prisma` : nouvelles tables `legal_documents` et `legal_acceptances` (+ enum `LegalDocumentType`). Le projet n'a pas de dossier de migrations : appliquer avec `prisma db push` (ou votre procédure habituelle) ; le client Prisma a déjà été régénéré ici.
- Nouvelle permission plateforme **`legal.manage`**, ajoutée au Super Administrateur. Les comptes déjà existants doivent la recevoir via `pnpm db:backfill-roles`, sinon la page Admin affichera « accès non autorisé ».

## Fronts (chacun autonome)

- `admin/features/legal/` : page `/legal` (menu « Plateforme ») — une carte par type avec toutes les versions (badges brouillon, version courante, remplacée), nombre d'acceptations, « Nouvelle version » (pré-remplie avec le texte de la dernière version), « Modifier » et « Publier » (avec confirmation) pour un brouillon.
- `learning/features/legal/` : pages publiques `/legal/cgu`, `/legal/cgv`, `/legal/confidentialite` rendues côté serveur, et liens dans le pied de page. Le contenu est du **texte brut** rendu paragraphe par paragraphe comme du texte React : aucun HTML administrateur n'est jamais interprété (pas d'injection possible).

## Limites connues

- **Aucun écran ne déclenche encore l'acceptation** : la route `POST /public/legal/:type/accept` et la table existent, mais ni l'inscription ni la connexion de l'apprenant ne demandent d'accepter la version courante. La trace n'est donc alimentée par aucun parcours pour l'instant.
- Pas d'affichage du texte dans les back-offices Entreprise et Admin pour leurs propres utilisateurs.
- Pas de mise en forme (titres, listes, liens) : texte brut seulement.
- Le texte n'est pas traduit : une seule langue par version.
- Pas de re-demande d'acceptation lorsqu'une nouvelle version est publiée.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 81 suites / 511 tests OK (nouveaux : 33 sur le domaine et les cas d'usage — numérotation, immutabilité, publication d'un brouillon incomplet, version courante sans brouillon, acceptation de la version précise, aucune écriture sans version publiée).
- Admin : `tsc`, ESLint OK, 30 tests OK. Learning : `tsc`, ESLint OK (pas de tests).
- **Non testé** : exécution des requêtes sur une vraie base, application du schéma, parcours dans le navigateur.
