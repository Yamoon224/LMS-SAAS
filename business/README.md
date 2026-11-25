# business

Back-office Entreprise (`{slug}-backoffice.votredomaine.com`).

## Lancer en développement

```bash
pnpm --filter business dev
```

## Structure

```
src/
  app/            # Routes Next.js (App Router), fines, délèguent aux features
  features/       # Logique métier par fonctionnalité (components/hooks/api/schemas)
  lib/            # Utilitaires transverses (client API, helpers)
  middleware.ts   # Résout le tenant à partir du sous-domaine {slug}-backoffice
```

Le middleware (`src/middleware.ts`) lit le header `Host` de la requête entrante,
vérifie qu'il correspond à `{slug}-backoffice.${NEXT_PUBLIC_APP_BASE_DOMAIN}`
et, si c'est le cas, injecte le `slug` extrait dans un header interne
`x-tenant-slug` transmis à la suite de la requête (routes, Server Components).

## Résolution du tenant en local (important)

Le backend résout le tenant **uniquement** depuis le `Host` HTTP de la
requête qu'il reçoit (`TenantResolutionMiddleware` + `TenantGuard`) : il
n'existe **aucun** secours par paramètre de requête ou en-tête explicite
côté backend. Pour tester le back-office d'une entreprise précise en local,
il faut donc faire pointer un vrai sous-domaine vers `127.0.0.1` :

1. Ajouter au fichier hosts de la machine (`C:\Windows\System32\drivers\etc\hosts`
   sous Windows) une ligne du type :
   ```
   127.0.0.1   acme-backoffice.votredomaine.local
   ```
   (remplacer `acme` par le slug réel du tenant créé via l'app admin).
2. Ouvrir `http://acme-backoffice.votredomaine.local:3000` (le port du `next dev`
   local) au lieu de `http://localhost:3000`.

Le proxy `/api/backend/[...path]` (voir `src/lib/tenant.ts`) reconstruit alors
le header `Host` attendu par le backend (`{slug}-backoffice.{APP_BASE_DOMAIN}`)
à partir du slug résolu par le middleware, indépendamment de l'URL réelle de
`NEXT_PUBLIC_API_URL` — donc même si l'API tourne sur `localhost:3001`, le
backend verra un `Host` tenant-scopé cohérent et résoudra le bon tenant.

Sans entrée hosts (accès via `localhost:3000` brut), aucun slug n'est résolu :
les pages se chargent mais tout appel à une route `business/*` échoue côté
backend avec `TENANT_NON_RESOLU` (404) — attendu, pas un bug.

## Session, permissions et en-tête Host (notes)

- `GET /api/auth/session` décode le JWT httpOnly côté serveur et renvoie `{ userId, roles, permissions }` (jamais le jeton). L'UI s'en sert pour masquer la navigation / les actions et afficher « Accès non autorisé » — confort uniquement, le backend reste l'autorité.
- Le backend lit `x-forwarded-host` avant `host`. Le `fetch` de Node (undici) **ignore un `Host` forgé** : les handlers `/api/auth/login` et `/api/backend/*` envoient donc aussi `X-Forwarded-Host`. En production, le reverse proxy doit écraser `X-Forwarded-Host` fourni par le client.
- Le cookie d'accès (15 min) expire avant le refresh token (7 j) : proxy, middleware et `/api/auth/session` rafraîchissent en silence.
