# SaaS LMS

Plateforme SaaS de formation en ligne **multi-entreprises** : chaque entreprise cliente dispose de son propre espace (back-office et site apprenant) sur son sous-domaine, et la plateforme est pilotée depuis un back-office Admin.

## Architecture

Monorepo **pnpm + Turborepo** composé de quatre applications :

| Dossier     | Rôle                                                                 | Adresse (modèle)              |
| ----------- | -------------------------------------------------------------------- | ----------------------------- |
| `backend/`  | API NestJS + Prisma (PostgreSQL), préfixe `/v1`                      | `api.<domaine>`               |
| `admin/`    | Back-office **Admin** de la plateforme (entreprises, plans, finances, audit…) | `admin.<domaine>`    |
| `business/` | Back-office **Entreprise** (formations, apprenants, certificats, reversements…) | `<slug>-backoffice.<domaine>` |
| `learning/` | Espace **Apprenant** (catalogue, parcours, certificats), aux couleurs de l'entreprise | `<slug>.<domaine>` |

Le routage multi-entreprises se fait par **nom d'hôte** (un seul niveau de sous-domaine, donc un seul certificat joker `*.<domaine>`). Une entreprise n'est servie que lorsqu'elle est **active** et qu'elle a un abonnement actif ou en essai.

Autres dossiers : `e2e/` (tests Playwright), `load/` (tests de charge), `deploy/` (Docker, Caddy, sauvegardes), `docs/` (cahier des charges, rapport de conformité, notes d'étapes).

### Technologies

- **Backend** : NestJS, Prisma, PostgreSQL, Redis (files BullMQ), stockage compatible S3, architecture hexagonale (`domain` / `application` / `infrastructure` / `presentation`), contrôle des dépendances avec dependency-cruiser.
- **Fronts** : Next.js (App Router), React, Tailwind CSS, Radix UI, TanStack Query, React Hook Form + Zod.
- **Qualité** : ESLint, Prettier, Vitest / Jest, Playwright (E2E et accessibilité), Husky + commitlint (commits conventionnels).

## Démarrage rapide

### Prérequis

- Node.js ≥ 20 et pnpm ≥ 9 (`corepack enable`)
- PostgreSQL 16 et Redis (le plus simple : `docker compose up -d`, qui lance aussi MinIO et Mailpit)

### Installation

```bash
pnpm install

# Variables d'environnement
cp .env.example .env                 # racine (référence de toutes les variables)
cp backend/.env.example backend/.env # adapter DATABASE_URL, REDIS_URL, secrets JWT…

# Base de données
pnpm db:generate
pnpm --filter backend exec prisma db push   # crée le schéma (le dépôt ne contient pas de migrations)
pnpm db:seed                                # rôles, compte Admin, entreprise « demo »
pnpm db:seed:demo                           # (facultatif) données de démonstration étalées sur 6 mois
```

### Lancer en développement

Chaque application se lance séparément, sur son propre port :

```bash
pnpm --filter backend dev                    # API        → http://localhost:3001/v1
pnpm --filter admin dev -- -p 3002           # Admin      → http://localhost:3002
pnpm --filter business dev -- -p 3003        # Entreprise
pnpm --filter learning dev -- -p 3004        # Apprenant
```

Les fronts ont besoin de `NEXT_PUBLIC_API_URL` (par exemple `http://localhost:3001/v1`) et `NEXT_PUBLIC_APP_BASE_DOMAIN` (la même valeur que `APP_BASE_DOMAIN` du backend, par exemple `localhost`) — voir `admin/.env.example`, `business/.env.example` et `learning/.env.example`, à copier en `.env.local`.

Avec `APP_BASE_DOMAIN=localhost`, les entreprises sont joignables sur `<slug>-backoffice.localhost` et `<slug>.localhost` (les navigateurs résolvent `*.localhost` en local). Exemple : `http://demo-backoffice.localhost:3003`.

### Comptes de démonstration (créés par `pnpm db:seed`)

| Espace      | E-mail                          | Mot de passe   |
| ----------- | ------------------------------- | -------------- |
| Admin       | `admin@votredomaine.local`      | `ChangeMe123!` |
| Entreprise  | `business@votredomaine.local`   | `ChangeMe123!` |
| Apprenant   | `learner@votredomaine.local`    | `ChangeMe123!` |

> ⚠️ Ces comptes sont réservés au développement : changez ces mots de passe avant toute exposition sur un réseau ou en production.

## Commandes utiles

| Commande                              | Effet                                                    |
| ------------------------------------- | -------------------------------------------------------- |
| `pnpm build` / `pnpm dev`             | Construit / lance tous les paquets (via Turborepo)       |
| `pnpm lint` · `pnpm typecheck`        | ESLint · vérification TypeScript                         |
| `pnpm test`                           | Tests unitaires de tous les paquets                      |
| `pnpm test:e2e` · `pnpm test:a11y`    | Tests Playwright (serveurs déjà lancés) · accessibilité  |
| `pnpm arch:check`                     | Contrôle des règles d'architecture du backend            |
| `pnpm format`                         | Formate le code avec Prettier                            |
| `pnpm db:generate` · `db:migrate`     | Client Prisma · migrations                               |
| `pnpm db:seed` · `pnpm db:seed:demo`  | Données de base · données de démonstration               |

Les commits suivent la convention **Conventional Commits** (`feat:`, `fix:`, `docs:`…), vérifiée par commitlint.

## Déploiement

Les fichiers de déploiement (Docker, Caddy avec certificat joker, sauvegardes chiffrées) sont dans [`deploy/`](deploy/README.md) : DNS joker `*.<domaine>`, certificat par défi DNS-01, variables dans `deploy/.env.prod.example`.

Les logos téléversés par l'Admin sont stockés sur disque (`uploads/logos`, variables `LOGO_STORAGE_DIR` et `PUBLIC_ASSETS_BASE_URL`) : en production, montez ce dossier sur un volume persistant partagé.

## Documentation

- [`docs/Cahier_des_charges_LMS_SaaS.pdf`](docs/Cahier_des_charges_LMS_SaaS.pdf) — cahier des charges
- [`docs/RAPPORT-CONFORMITE-CDC.md`](docs/RAPPORT-CONFORMITE-CDC.md) — conformité au cahier des charges
- [`docs/etapes/`](docs/etapes) — notes de conception par étape
- [`docs/registre-des-traitements.md`](docs/registre-des-traitements.md) — registre des traitements de données
