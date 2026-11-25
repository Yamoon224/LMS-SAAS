#!/usr/bin/env bash
# Restauration d'une sauvegarde chiffrée produite par backup.sh.
# Usage : deploy/backup/restore.sh <fichier.dump.enc> [base_cible]
#   base_cible : défaut = base de production ($POSTGRES_DB). DESTRUCTIF : les objets existants sont remplacés.
#   Pour un test de restauration sans risque : restore.sh <fichier> saas_lms_restore_test
# Variables : BACKUP_PASSPHRASE_FILE (obligatoire), COMPOSE_CMD, RESTORE_CMD (remplace l'exécution dans le conteneur).
set -euo pipefail

file="${1:?Usage: restore.sh <fichier.dump.enc> [base_cible]}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose --env-file deploy/.env.prod -f deploy/docker-compose.yml}"
: "${BACKUP_PASSPHRASE_FILE:?BACKUP_PASSPHRASE_FILE est requis}"

[ -r "$file" ] || { echo "Fichier introuvable : $file" >&2; exit 1; }
if [ -r "$file.sha256" ]; then
  ( cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" ) || { echo "Somme de contrôle invalide" >&2; exit 1; }
fi

if [ -n "${RESTORE_CMD:-}" ]; then
  target_db="${2:-}"
  decrypt() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_PASSPHRASE_FILE" -in "$file"; }
  # shellcheck disable=SC2086
  decrypt | $RESTORE_CMD --clean --if-exists --no-owner --no-privileges ${target_db:+--dbname="$target_db"}
  exit 0
fi

target_db="${2:-}"
if [ -z "$target_db" ]; then
  echo "ATTENTION : restauration dans la base de PRODUCTION. Arrêtez backend avant (docker compose stop backend)."
  read -r -p "Tapez RESTAURER pour confirmer : " answer
  [ "$answer" = "RESTAURER" ] || { echo "Annulé."; exit 1; }
fi

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_PASSPHRASE_FILE" -in "$file" \
  | $COMPOSE_CMD exec -T -e TARGET_DB="$target_db" postgres sh -c '
      db="${TARGET_DB:-$POSTGRES_DB}"
      if [ "$db" != "$POSTGRES_DB" ]; then
        psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$db\"" -c "CREATE DATABASE \"$db\""
      fi
      pg_restore -U "$POSTGRES_USER" -d "$db" --clean --if-exists --no-owner --no-privileges --exit-on-error
    '

echo "[restore] terminé. Redémarrez ensuite : docker compose up -d backend"
