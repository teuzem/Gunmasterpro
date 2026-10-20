#!/bin/sh
# Point d'entrée du conteneur.
#
# Le volume de médias est monté par Docker comme volume nommé : il est donc créé
# à vide, avec la propriété de root et les permissions 0755. L'application
# tournant en USER node, toute écriture y échoue (EACCES) — l'import de médias
# renvoyait alors 500. Un chown effectué pendant le build ne suffit pas : le
# montage du volume masque le contenu de l'image, permissions comprises.
#
# On corrige donc les droits du volume au démarrage, puis on lâche les
# privilèges root et on exécute l'application en tant que node.
#
# gosu est installé dans l'image : ni su ni setpriv ne sont garantis dans une
# image Debian slim.
set -e

MEDIA_DIR="${LOCAL_MEDIA_DIR:-/app/data/media}"

if [ "$(id -u)" = "0" ]; then
  if ! mkdir -p "$MEDIA_DIR" 2>/dev/null; then
    echo "[entrypoint] volume $MEDIA_DIR inaccessible" >&2
  else
    # Sans échec si le volume est déjà au bon propriétaire.
    chown -R node:node "$MEDIA_DIR" 2>/dev/null || true
    chmod -R u+rwX "$MEDIA_DIR" 2>/dev/null || true
  fi

  echo "[entrypoint] démarrage en tant que node"
  exec gosu node "$@"
fi

exec "$@"