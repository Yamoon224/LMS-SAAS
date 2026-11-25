# Tests de charge (k6)

> **Ne jamais viser la production.** Ces scripts génèrent un trafic intense, des tentatives de connexion échouées
> (login) et du bruit dans les journaux d'audit. Cibles autorisées : poste de développement, environnement de test
> dédié. `lib.js` refuse les URL/domaines contenant `prod`/`production`, mais ce garde-fou ne remplace pas le jugement.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `k6/smoke.js` | 1 VU, 30 s : santé, catalogue public, détail, tableau de bord apprenant, login (setup). |
| `k6/load.js` | Montée à 50 VU (1 min), palier 3 min : catalogue, détail, tableau de bord apprenant, listes business. |
| `k6/stress.js` | Paliers 50 → 100 → 200 VU puis pic (spike) à 300 VU : point de rupture, aucun 5xx toléré. |
| `k6/login-ratelimit.js` | 25 mauvais logins : exige des 429 au-delà de 10/min, aucun 5xx. |
| `k6/lib.js` | Config (env), en-tête `Host`, login unique, métriques, seuils. |
| `node-smoke.mjs` | Exécuteur de repli sans k6 (fetch + concurrence), mêmes routes ; `pnpm test:load:smoke`. |

## Variables d'environnement

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `K6_BASE_URL` | `http://localhost:3001/v1` | URL de l'API |
| `K6_BASE_DOMAIN` | `localhost` | domaine de base (doit correspondre à `APP_BASE_DOMAIN` du backend) |
| `K6_TENANT` | `demo` | sous-domaine du tenant : `demo.<domaine>` (public/apprenant), `demo-backoffice.<domaine>` (business) |
| `K6_PASSWORD`, `K6_LEARNER_EMAIL`, `K6_BUSINESS_EMAIL`, `K6_ADMIN_EMAIL` | comptes de démo du seed | identifiants ; à surcharger pour tout autre environnement |

Le backend résout surface et tenant depuis `Host` / `X-Forwarded-Host` : k6 envoie `Host`, `node-smoke.mjs`
envoie `X-Forwarded-Host` (`fetch` ne permet pas de surcharger `Host`).

## Installer k6

- Windows : `winget install k6 --source winget` (ou `choco install k6`), puis `k6 version`.
- Docker : `docker run --rm -i -v "%cd%:/work" -w /work -e K6_BASE_URL=http://host.docker.internal:3001/v1 grafana/k6 run load/k6/smoke.js`
  (sous PowerShell : `${PWD}`). `localhost` dans le conteneur désigne le conteneur : utiliser `host.docker.internal`.

## Commandes

```
k6 run load/k6/smoke.js
k6 run load/k6/load.js
k6 run load/k6/stress.js
k6 run load/k6/login-ratelimit.js      # laisse l'IP limitée ~1 min
K6_TENANT=demo K6_BASE_DOMAIN=localhost k6 run load/k6/load.js
pnpm test:load:smoke                   # repli Node (smoke) ; options : -- --scenario=load --concurrency=10 --duration=15
```

`node-smoke.mjs` est plafonné à 20 requêtes concurrentes et 30 s.

## Interpréter les seuils

- `http_req_failed < 1 %` : réponses hors 2xx/3xx **et hors 429** (le callback `expectedStatuses` de `lib.js` classe 429
  comme attendu). `server_errors < 1 %` : statuts >= 500, le vrai signal de casse.
- `lat_<endpoint> p(95) < X ms` : latence des seules réponses 2xx, par endpoint (les 429, très rapides, ne faussent pas
  les percentiles). Un endpoint sans 2xx n'a pas de métrique : le seuil échoue ou est vide, à lire avec `rate_limited`.
- `rate_limited` : part de 429, informative.
- **Limiteurs du backend** : plafond global **100 requêtes/min/IP** (`ThrottlerModule`), login **10/min/IP**. Depuis une
  seule machine, `load.js` et `stress.js` reçoivent donc surtout des 429 : ils valident l'absence de 5xx et la
  dégradation propre, pas la capacité réelle. Pour mesurer la capacité, relever le plafond sur un environnement de test
  ou répartir la charge sur plusieurs IP (k6 cloud, plusieurs injecteurs).
- Le login n'est exécuté qu'une fois par surface (`setup()`), jamais dans la boucle de charge.
- Si la 2FA est active pour un compte, aucun jeton n'est obtenu : les routes authentifiées sont ignorées.
