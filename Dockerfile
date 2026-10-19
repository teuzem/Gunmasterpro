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
# Copie des images de catégorie depuis le build context dans le stockage local
# servi par /manus-storage/* au runtime.
COPY --from=build /app/public/images categories ./data/media/images categories
COPY --from=build /app/public/images hero section ./data/media/images hero section
COPY --from=build /app/public/pakarms_catalog_export/images ./data/media/pakarms_catalog_export/images
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
