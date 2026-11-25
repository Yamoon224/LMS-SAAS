# Étape 01 — Autonomie des composants

**Date** : 2026-11-17

## Décision

Chaque composant (`backend`, `admin`, `business`, `learning`) contient **toutes** ses ressources dans son propre dossier. Aucune ressource n'est partagée entre deux composants (ceci remplace, pour le projet, le dossier `packages/` prévu à la section 13.3 du cahier des charges).

## Changements

| Avant | Après |
| --- | --- |
| `packages/config` (tsconfig, ESLint, preset Tailwind partagés) | Fichiers copiés dans chaque composant |
| `packages/ui`, `packages/api-client`, `packages/i18n` (vides) | Supprimés : UI, client API et traductions vivent déjà dans chaque app (`src/components/ui`, `src/lib/api-client.ts`, `src/locales`) |
| `extends: "@saas-lms/config/..."` | `tsconfig.json` complet dans chaque composant |
| `require("@saas-lms/config/eslint-*.cjs")` | `eslint.config.cjs` complet dans chaque composant |
| `@saas-lms/config/tailwind.preset.js` | `tailwind.preset.cjs` local aux 3 apps Next.js |
| `pnpm-workspace.yaml` : `packages/*` | Retiré |

Les plugins ESLint (`@eslint/js`, `typescript-eslint`, `eslint-plugin-import`, `eslint-config-prettier`, plus `react-hooks` / `jsx-a11y` pour les apps Next.js) sont déclarés dans le `package.json` de chaque composant.

## Règle à respecter désormais

- Ne jamais importer un fichier d'un autre composant.
- Besoin commun (ex. un composant de bouton, un type d'API) : on le **duplique** dans chaque composant concerné.
- Les outils racine (Turbo, Prettier, Husky, commitlint, dependency-cruiser) restent à la racine : ce sont des outils de dépôt, pas des ressources de composant.

## Vérification

- `pnpm install --offline` : OK
- `tsc --noEmit` : OK sur les 4 composants
- `eslint` : 0 erreur sur les 4 composants (2 avertissements préexistants dans le backend)
