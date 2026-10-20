# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm check && pnpm test && pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Corepack ne doit jamais bloquer sur une invite interactive dans le conteneur :
# au runtime il n'a plus le cache du build et proposerait de télécharger pnpm.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# gosu permet de corriger les droits du volume puis de lâcher root sans
# dépendre de su ou setpriv, absents de l'image slim.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
# Keep drizzle-kit available so Coolify can run pnpm db:deploy in this image.
RUN pnpm install --frozen-lockfile && pnpm store prune
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/scripts ./scripts
# Outils d'exploitation : seed catalogue, vérification des visuels, relevé de
# l'openId propriétaire. Ils sont exécutés depuis le conteneur en production
# (Coolify > Terminal), donc doivent exister dans l'image. Les manifestes
# tools/*.json qu'ils lisent sont versionnés avec le code.
COPY --from=build /app/tools ./tools
# scripts/seed-hero-slides.ts lit les textes trilingues des diapositives dans
# client/src/lib/homeHeroContent.ts. Sans ce fichier, le seed hero échoue en
# ERR_MODULE_NOT_FOUND. Seul le dossier lib est repris, pas tout le client.
COPY --from=build /app/client/src/lib ./client/src/lib
# Point d'entrée : le volume de médias est monté par Docker comme volume nommé,
# donc créé à vide et propriétaire root (0755). L'application tournant en
# USER node, toute écriture y échoue (EACCES) — l'import de médias renvoyait
# alors 500. Un chown effectué pendant le build ne suffit pas : le montage du
# volume masque le contenu de l'image, permissions comprises. L'entrée corrige
# donc les droits du volume au démarrage, puis lâche les privilèges root.
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
