# Étape 34 — Tests front (Testing Library), E2E Playwright et couverture

**Date** : 2026-11-19
**Référence cahier des charges** : sections 13, 14 et 19 (qualité logicielle et tests).
**Rapport d'écarts** : `docs/RAPPORT-CONFORMITE-CDC.md` section 6 (« Tests front : 12 fichiers, environnement node, sans Testing Library », « E2E Playwright : ABSENT ») et section 10 point 6.

Aucun code de production n'est modifié. Les anomalies rencontrées en chemin sont listées dans « Limites connues ».

## Exigences traitées

1. **Tests de composants et de logique des trois fronts** avec `vitest` + `@testing-library/react` (`jsdom`, `user-event`, `jest-dom`), en complément des tests existants (schémas, sanitize, i18n…) qui restent en environnement `node`.
2. **Mesure de couverture** `@vitest/coverage-v8` (rapport texte, **sans seuil bloquant**) sur chaque front.
3. **E2E Playwright** (`e2e/`) contre les serveurs de dev déjà lancés, avec le Chrome installé (aucun téléchargement de navigateur).
4. **Couverture backend** publiée.

## Choix de conception

1. **Environnement par fichier** : les tests de composants déclarent `// @vitest-environment jsdom` ; la configuration reste `node` pour tout le reste (suite rapide, pas de régression des tests existants). `vitest.setup.ts` (par front) charge `jest-dom` et nettoie le DOM après chaque test.
2. **JSX** : `oxc.jsx.runtime = "automatic"` dans les `vitest.config.*` (Vite 8). Alias `@` ajouté à `learning`.
3. **Pas de duplication** : les tests existants (schémas 2FA, analytics, `lang-param`, `site-url`, dictionnaires…) ne sont pas répétés. Les composants UI identiques entre `admin` et `business` (password-input, confirm-dialog, formulaire de connexion) sont testés dans les deux fronts, puisque le code est volontairement dupliqué (règle « aucune ressource partagée », étape 01).
4. **Écrans en cours de modification évités** (certificats, abonnement, tenants) : on teste les briques stables (UI, auth, middleware, utilitaires). Seul le **schéma** de création d'entreprise est couvert (pas son écran).
5. **E2E sans démarrer de serveur** : `e2e/playwright.config.ts` ne lance rien ; `channel: "chrome"` (variable `E2E_CHANNEL=msedge` pour Edge). Une connexion par front dans un projet `setup`, session réutilisée (`e2e/.auth/*.json`, ignoré par git) pour ne pas déclencher la limitation de débit du login.
6. **Domaine des sous-domaines** : le middleware des fronts ne résout le tenant que sous `NEXT_PUBLIC_APP_BASE_DOMAIN`. Le défaut E2E est donc `E2E_BASE_DOMAIN=votredomaine.local` (valeur des `.env.example`), et le navigateur mappe lui-même `*.votredomaine.local` et `*.localhost` vers `127.0.0.1` (`--host-resolver-rules`), sans fichier hosts. Si vos serveurs tournent avec `localhost` comme domaine de base (`backend/.env` : `APP_BASE_DOMAIN=localhost`), lancez avec `E2E_BASE_DOMAIN=localhost`.
7. **CI** : workflow séparé `.github/workflows/e2e.yml`, manuel (`workflow_dispatch`), `continue-on-error: true` : non bloquant. Il monte PostgreSQL/Redis, migre, charge le seed, démarre les 4 serveurs de dev, installe Chrome et publie le rapport. À valider une première fois (variables d'environnement du backend à compléter selon `backend/.env.example`). Le workflow `ci.yml` n'est pas modifié : `pnpm test` y exécute déjà les nouveaux tests front.
8. **Turbo** : le script racine `pnpm test:e2e` appelle Playwright directement (`playwright test --config e2e/playwright.config.ts`). La tâche `test:e2e` de `turbo.json` (qui dépend de `build` et vise le script `test:e2e` du backend, intégration Testcontainers) n'est plus ce que lance la racine : elle reste disponible via `pnpm --filter backend test:e2e`.

## Suites ajoutées

### Admin (7 fichiers)
- `src/components/ui/password-input.test.tsx`, `search-input.test.tsx`, `checkbox.test.tsx`, `confirm-dialog.test.tsx` (dialogue Radix : rôle, description, Échap, état « en cours »).
- `src/features/auth/components/LoginForm.test.tsx` : validation, erreur serveur, redirection `?from=`, bouton désactivé pendant l'envoi.
- `src/features/tenants/schemas/tenant.schema.test.ts` : création d'entreprise (mot de passe **optionnel**, 8 caractères minimum, **confirmation identique**, slug/pays/devise/e-mail), `toCreateTenantPayload`, motif de suspension.
- `src/lib/format.test.ts`.

### Business (7 fichiers)
- `src/middleware.test.ts` : résolution `{slug}-backoffice.{base}` (port, tirets, `x-forwarded-host`, domaine nu, `admin`/`api`/`{slug}` ignorés, **`x-tenant-slug` forgé par le client écrasé**), redirection `/login?from=`, pages publiques, cookies de session.
- `src/lib/tenant.test.ts`, `jwt.test.ts`, `format.test.ts`.
- `src/components/ui/password-input.test.tsx`, `confirm-dialog.test.tsx`, `src/features/auth/components/LoginForm.test.tsx`.

### Learning (6 fichiers)
- `src/middleware.test.ts` : `{slug}` (jamais `admin`, `api`, `*-backoffice`), anti-usurpation du header, slug de dev, routes protégées, redirection d'un apprenant connecté hors de `/login`, `?lang=` (cookie d'un an, langue inconnue ignorée).
- `src/lib/tenant.test.ts`, `url.test.ts`, `format.test.ts`.
- `src/components/ui/password-input.test.tsx` (libellés traduits), `src/features/auth/components/LoginForm.test.tsx` (messages de validation traduits, erreur serveur, refus de redirection ouverte `//evil`).

### E2E (`e2e/tests/`)
| Fichier | Parcours |
| --- | --- |
| `auth.setup.ts` | connexion des trois comptes de démo, session enregistrée |
| `admin.flows.spec.ts` | (a) liste des entreprises chargée, tableau de bord, (e) burger mobile 390 px : ouvre, ferme, navigation |
| `business.flows.spec.ts` | (b) tableau de bord du propriétaire, (e) burger mobile 390 px |
| `learning.flows.spec.ts` | (c) « Mon apprentissage », `/login` redirige un apprenant connecté |
| `public.pages.spec.ts` | (d) mauvais mot de passe sur les 3 fronts, validation locale, (f) aucun débordement horizontal à 390 px sur 10 pages publiques |

## Commandes

| Suite | Commande |
| --- | --- |
| Tests front (par app) | `pnpm --filter admin test` · `--filter business` · `--filter learning` |
| Couverture front | `pnpm --filter <app> test:cov` (rapport texte, pas de seuil) |
| Tous les tests | `pnpm test` |
| Backend (unitaires) | `pnpm --filter backend test` |
| Couverture backend | `pnpm --filter backend test:cov` (seuil global jest 70/80/80/80 : **atteint**, voir ci-dessous) |
| E2E | `pnpm test:e2e` (serveurs déjà lancés) ; rapport : `pnpm test:e2e:report` |
| E2E, un projet | `pnpm test:e2e --project=public` (ou `admin`, `business`, `learning`) |

Variables E2E : `E2E_ADMIN_URL`, `E2E_BUSINESS_URL`, `E2E_LEARNING_URL`, `E2E_API_URL`, `E2E_BASE_DOMAIN`, `E2E_CHANNEL`, `E2E_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_BUSINESS_EMAIL`, `E2E_LEARNER_EMAIL`. Défauts : admin `http://localhost:3002`, business `http://demo-backoffice.votredomaine.local:3003`, learning `http://demo.votredomaine.local:3004`, API `http://localhost:3001/v1`, comptes de démo du seed, mot de passe `ChangeMe123!`.

## État réel (2026-11-19)

### Tests front (vitest)
| Front | Fichiers | Tests | Résultat | Fichiers de test ajoutés | Couverture (instructions / branches / fonctions / lignes) |
| --- | --- | --- | --- | --- | --- |
| admin | 18 | 129 | **tous verts** (~8 s) | 7 | 11,8 % / 14,0 % / 7,5 % / 11,7 % |
| business | 16 | 152 | **tous verts** (~7 s) | 7 | 12,2 % / 11,6 % / 8,2 % / 11,9 % |
| learning | 18 | 152 | **tous verts** (~8 s) | 6 | 14,9 % / 16,2 % / 12,4 % / 14,6 % |

Avant l'étape : admin 9 fichiers / 86 tests, business 9 / 121, learning 12 / 126. La couverture est mesurée sur tout `src/` hors `app/`, ce qui explique les valeurs basses : la cible de 70 % reste hors d'atteinte sans tests des écrans et des hooks. Aucun seuil n'est imposé.

### Backend
Mesure initiale (2026-11-19) : 153 suites, 1356 tests, seuils non atteints (66,1 % lignes). Résultat après complément des tests ci-dessous.

### Backend (mise à jour : seuils atteints, 2026-11-20)
`pnpm --filter backend test:cov` : **237 suites, 2284 tests, tous verts**, **les seuils globaux (70/80/80/80) sont atteints sans les modifier** ni réduire `collectCoverageFrom`, et sans `istanbul ignore`.

| Métrique | Avant (2026-11-19) | Après | Seuil |
| --- | --- | --- | --- |
| Lignes | 66,1 % | **96,0 %** (7520/7832) | 80 % |
| Instructions | 66,3 % | **96,2 %** (8500/8835) | 80 % |
| Branches | 56,4 % | **86,6 %** (3420/3949) | 70 % |
| Fonctions | 63,8 % | **99,8 %** (1801/1804) | 80 % |

Durée de la mesure complète : environ 3 min 10 s avec `--maxWorkers=4` sur une machine peu chargée (plus de 30 min machine saturée). Environ 880 tests ajoutés (use cases, listeners, entités, calculs financiers : prorata, remises, commissions, ledger ; assessments, enrollments, certificates, notifications, audit, etc.). Reste non couvert : les barrels `index.ts` et quelques branches défensives isolées. Sous Windows, des exécutions jest concurrentes peuvent provoquer une erreur EPERM du cache de transformation (relancer la suite concernée).

### E2E Playwright (Chrome installé)
| Projet | Résultat |
| --- | --- |
| `public` (d × 3, validation locale, f × 10) | **14 / 14 verts** |
| `admin` (a, tableau de bord, e × 2) | **4 / 4 verts** |
| `setup` admin | vert |
| `setup` business, `setup` learning, `business` (b, e), `learning` (c) | **non exécutables ce jour** : voir ci-dessous (6 tests non validés) |

## Limites connues

1. **Connexions tenant en échec sur l'environnement de dev au moment des essais** : toute requête portant un tenant (`demo-backoffice.*`, `demo.*`) renvoie **HTTP 500** côté backend, alors que la connexion admin fonctionne. Cause identifiée : la base de dev n'a pas reçu les évolutions du schéma Prisma faites en parallèle (`prisma migrate diff` montre notamment la table `attendance_certificates` manquante ; la base est gérée sans migrations). Je n'ai ni modifié le schéma ni appliqué de `db push` sur la base partagée. Les parcours (b), (c) et le burger business sont écrits mais **non validés** ; à relancer (`pnpm test:e2e`) après `pnpm db:migrate` / `db push`.
2. **Test (d) business et learning peu discriminants aujourd'hui** : le message cherché inclut « impossible » car, avec le 500 ci-dessus, le front affiche « Connexion impossible pour le moment. ». Une fois la base à jour, le backend répond **400** `IDENTIFIANTS_INVALIDES` pour un mauvais mot de passe.
3. **Anomalie de production (non corrigée)** : les routes `api/auth/login` d'`admin` et de `business` (et le message de `learning`) n'affichent « E-mail ou mot de passe incorrect. » que pour un statut **401**, alors que le backend répond **400** `IDENTIFIANTS_INVALIDES`. Un mauvais mot de passe affiche donc le message générique « Connexion impossible pour le moment. ». À corriger (accepter 400 avec ce code, ou renvoyer 401 côté backend), puis resserrer le test (d).
4. **Limitation de débit du login** : le backend limite les tentatives (HTTP 429, quelques minutes). Les E2E se connectent une fois par front ; relancer trop souvent les parcours de mauvais mot de passe peut déclencher le 429.
5. **Serveurs de dev lents ou saturés** : première compilation de page longue ; les délais E2E sont larges (90 s par test, 20 s par assertion) et la config limite le total à 20 minutes. Un worker, exécution séquentielle.
6. **Domaine de base** : voir choix 6. Un décalage entre `E2E_BASE_DOMAIN` et la configuration réelle des fronts/backend produit des 500 à la connexion tenant.
7. **Couverture front basse (11 à 15 %)** : composants de formulaire métier, hooks React Query et écrans non testés. Pas de MSW ; les appels réseau des formulaires sont simulés par `vi.mock` des modules `*.api`.
8. **Le workflow `e2e.yml` n'a pas été exécuté** (pas de GitHub Actions ici) ; la préparation de l'environnement du backend (variables, secrets de dev) est à compléter.
9. Pas d'axe, k6, OWASP ZAP ni de tests de contrat fournisseurs (restent **ABSENT** au rapport de conformité).

## Vérification

```
pnpm --filter admin test        # 18 fichiers, 129 tests verts
pnpm --filter business test     # 16 fichiers, 152 tests verts
pnpm --filter learning test     # 18 fichiers, 152 tests verts
pnpm test:e2e --project=public  # 14 verts
pnpm test:e2e --project=admin   # nécessite le projet setup (admin) : vert
```
