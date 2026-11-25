# admin

Back-office Admin plateforme (`admin.votredomaine.com`).

## Lancer en développement

```bash
pnpm --filter admin dev
```

## Structure

```
src/
  app/            # Routes Next.js (App Router), fines, délèguent aux features
  features/       # Logique métier par fonctionnalité (components/hooks/api/schemas)
  lib/            # Utilitaires transverses (client API, helpers)
  middleware.ts   # Middleware Next.js (pas de résolution tenant pour l'admin)
```
