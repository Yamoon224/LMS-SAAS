# learning

Plateforme publique apprenant (`{slug}.votredomaine.com`).

## Lancer en développement

```bash
pnpm --filter learning dev
```

## Structure

```
src/
  app/            # Routes Next.js (App Router), fines, délèguent aux features
  features/       # Logique métier par fonctionnalité (components/hooks/api/schemas)
  lib/            # Utilitaires transverses (client API, helpers)
  middleware.ts   # Résout le tenant depuis le sous-domaine {slug} (header x-tenant-slug)
```

Points clés :

- Le `middleware.ts` lit le header `Host` pour extraire le sous-domaine
  `{slug}` et l'injecte dans un header interne `x-tenant-slug` transmis aux
  routes. Les sous-domaines `admin`, `api` et `*-backoffice` sont hors scope
  de cette app et ne déclenchent aucune résolution de tenant.
- La page catalogue (`src/app/page.tsx`) est rendue en SSR (Server Component)
  pour le référencement (SEO) : les formations publiques sont récupérées
  côté serveur avant l'envoi du HTML.
- L'interface est conçue mobile-first.
