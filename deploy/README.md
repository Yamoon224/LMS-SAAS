# Déploiement — SaaS LMS

Contenu : `docker/` (Dockerfiles), `caddy/` (reverse proxy), `docker-compose.yml` (production), `backup/` (sauvegardes), `.env.prod.example`.
Ces fichiers n'ont pas été exécutés par l'équipe de développement (Docker absent du poste de dev) : faire une première passe sur un serveur de recette.

## 1. DNS

Zone `<base>` (= `APP_BASE_DOMAIN`), tous les enregistrements vers l'IP publique du serveur :

| Enregistrement | Rôle                                         |
| -------------- | -------------------------------------------- |
| `A  *.<base>`  | joker : `api`, `admin`, `{slug}`, `{slug}-backoffice` |
| `A  <base>`    | optionnel (non routé par défaut)             |

Un seul niveau de sous-domaine est utilisé (`{slug}-backoffice` et non `backoffice.{slug}`), donc **un seul certificat joker `*.<base>`** suffit.

## 2. Certificat joker `*.<base>`

Let's Encrypt n'émet un certificat joker que par défi **DNS-01**. Caddy est donc construit avec le module DNS de votre fournisseur (`deploy/caddy/Dockerfile`, argument `DNS_PLUGIN`) :

1. Choisir le module : `cloudflare`, `route53`, `ovh`, `gandi`, `digitalocean`... (<https://github.com/caddy-dns>).
2. Créer un jeton API limité à l'édition de la zone DNS, le mettre dans `DNS_API_TOKEN`; renseigner `DNS_PLUGIN` et `DNS_PROVIDER` (même valeur) dans `.env.prod`.
3. Si le fournisseur demande plusieurs paramètres (Route 53 : clés AWS ; OVH : endpoint + clés), adapter le bloc `tls { dns ... }` du `Caddyfile`.
4. Le renouvellement est automatique ; conserver le volume `caddy_data` (sinon redemande de certificat et limites de taux Let's Encrypt). Test sans limite : ajouter `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` dans le bloc global du Caddyfile.

Alternative nginx + certbot : `certbot certonly --dns-<fournisseur> -d "*.<base>"`, puis un `server_name ~^(?<sub>.+)\.<base>$` avec `map $host` vers les 4 upstreams (mêmes règles que le Caddyfile). Non fourni : Caddy est la voie supportée.

## 3. Routage (Caddyfile)

| Hôte                       | Destination        |
| -------------------------- | ------------------ |
| `api.<base>`               | `backend:3001`     |
| `admin.<base>`             | `admin:3000`       |
| `*-backoffice.<base>`      | `business:3000`    |
| tout autre `*.<base>`      | `learning:3000`    |

Le proxy ajoute `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For`, conserve le `Host` d'origine (le backend résout le tenant depuis le sous-domaine), active HSTS (1 an), la compression zstd/gzip et limite les corps de requête à `MAX_UPLOAD_SIZE` (110 Mo par défaut).

## 4. Variables d'environnement

Copier `deploy/.env.prod.example` en `deploy/.env.prod` et remplir (secrets : `openssl rand -base64 48`). Le fichier est ignoré par git. `DATABASE_URL` et `REDIS_URL` sont composés par le compose à partir de `POSTGRES_*` et `REDIS_PASSWORD`. Les variables `NEXT_PUBLIC_*` sont **figées au build** des fronts : reconstruire les images après modification.
Nouveautés : `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_DSN` (vides = désactivé) ; `DNS_*`, `ACME_EMAIL`, `MAX_UPLOAD_SIZE`, `IMAGE_*`, `BACKUP_*`.

## 5. Démarrage

```bash
# depuis la racine du dépôt
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml build
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml up -d
# options : --profile minio (S3 local) --profile antivirus (clamd)
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml ps   # tous "healthy"
```

Ordre : postgres, redis → `migrate` (prisma migrate deploy, one-shot) → backend → fronts → caddy. Première installation : exécuter la graine si besoin (`pnpm --filter backend db:seed` depuis un poste ayant accès à la base, ou un conteneur ad hoc avec le dépôt).
Mise à jour : `git pull`, `build`, `up -d` (les migrations rejouent automatiquement). Réseau `data` interne : postgres, redis, minio, clamav ne sont jamais publiés.

## 6. Sauvegarde et restauration

- **Sauvegarde** : `BACKUP_PASSPHRASE_FILE=/etc/saas-lms/backup.pass deploy/backup/backup.sh` → `pg_dump` format custom, chiffré AES-256 (openssl, PBKDF2), somme SHA-256, rotation (14 quotidiennes, 8 hebdomadaires), copie S3 optionnelle (`BACKUP_S3_URI`).
  Cron conseillé : `0 * * * * cd /opt/saas-lms && set -a && . deploy/.env.prod && set +a && deploy/backup/backup.sh >> /var/log/saas-lms-backup.log 2>&1`.
- **Phrase secrète** : `openssl rand -base64 48 > /etc/saas-lms/backup.pass && chmod 600`. En conserver une copie **hors du serveur** : sans elle les sauvegardes sont illisibles.
- **Restauration** : `deploy/backup/restore.sh <fichier.dump.enc> [base_cible]`. Sans base cible : base de production (confirmation `RESTAURER`, arrêter le backend avant).
- **Test de restauration (à faire chaque trimestre)** : `restore.sh <fichier> saas_lms_restore_test`, puis comparer quelques comptages.
- Hors périmètre du dump : volumes S3/MinIO (activer le versionnement et la réplication du bucket), Redis (files : rejouables, les échecs sont conservés mais non critiques), `caddy_data` (certificats régénérables).

Objectifs RPO/RTO, procédure de reprise : voir `docs/etapes/33-exploitation.md`.
