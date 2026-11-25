#!/usr/bin/env bash
# Sauvegarde PostgreSQL chiffrée (pg_dump format custom + AES-256 via openssl) avec rotation.
# Usage : deploy/backup/backup.sh            (depuis la racine du dépôt ; cron conseillé : toutes les heures/jours)
# Variables (voir deploy/.env.prod) :
#   BACKUP_DIR              dossier de destination            (défaut /var/backups/saas-lms)
#   BACKUP_PASSPHRASE_FILE  fichier contenant la phrase secrète (OBLIGATOIRE, chmod 600, copie hors serveur !)
#   BACKUP_RETENTION_DAILY  nombre de sauvegardes quotidiennes conservées (défaut 14)
#   BACKUP_RETENTION_WEEKLY nombre de sauvegardes hebdomadaires (dimanche) conservées (défaut 8)
#   BACKUP_S3_URI           ex. s3://bucket/saas-lms/ : copie hors site via `aws s3 cp` (optionnel)
#   COMPOSE_CMD             commande compose (défaut : docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml)
#   PG_DUMP_CMD             remplace l'exécution dans le conteneur (ex. "pg_dump -h db -U u dbname")
set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/saas-lms}"
RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-14}"
RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-8}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml}"

: "${BACKUP_PASSPHRASE_FILE:?BACKUP_PASSPHRASE_FILE est requis (fichier de phrase secrète)}"
[ -r "$BACKUP_PASSPHRASE_FILE" ] || { echo "Phrase secrète illisible : $BACKUP_PASSPHRASE_FILE" >&2; exit 1; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/daily/saas-lms-$stamp.dump.enc"
tmp="$target.partial"
trap 'rm -f "$tmp"' EXIT

echo "[backup] début $stamp"
if [ -n "${PG_DUMP_CMD:-}" ]; then
  # shellcheck disable=SC2086
  $PG_DUMP_CMD --format=custom --no-owner --no-privileges
else
  # Le mot de passe est déjà dans l'environnement du conteneur postgres.
  $COMPOSE_CMD exec -T postgres sh -c 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"'
fi | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$BACKUP_PASSPHRASE_FILE" -out "$tmp"

[ -s "$tmp" ] || { echo "[backup] fichier vide, abandon" >&2; exit 1; }
mv "$tmp" "$target"
trap - EXIT
( cd "$BACKUP_DIR/daily" && sha256sum "$(basename "$target")" > "$(basename "$target").sha256" )

# Copie hebdomadaire (dimanche UTC).
if [ "$(date -u +%u)" = "7" ]; then
  cp "$target" "$target.sha256" "$BACKUP_DIR/weekly/"
fi

# Rotation : on garde les N plus récentes de chaque catégorie.
rotate() {
  local dir="$1" keep="$2"
  # shellcheck disable=SC2012
  ls -1t "$dir"/*.dump.enc 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
    rm -f -- "$old" "$old.sha256"
  done
}
rotate "$BACKUP_DIR/daily" "$RETENTION_DAILY"
rotate "$BACKUP_DIR/weekly" "$RETENTION_WEEKLY"

if [ -n "${BACKUP_S3_URI:-}" ]; then
  aws s3 cp "$target" "${BACKUP_S3_URI%/}/" --only-show-errors
  aws s3 cp "$target.sha256" "${BACKUP_S3_URI%/}/" --only-show-errors
  echo "[backup] copie hors site : ${BACKUP_S3_URI%/}/$(basename "$target")"
fi

echo "[backup] terminé : $target ($(du -h "$target" | cut -f1))"
