# syntax=docker/dockerfile:1

# ---- base: shared toolchain --------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps: install once, cached by lockfile ---------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- dev: hot-reloading Vite server (target this from docker compose) -------
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
# --host exposes the dev server outside the container
CMD ["pnpm", "dev", "--host"]

# ---- build: produce static assets -------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm build            # → /app/dist

# ---- serve: tiny nginx image, no Node in the final layer --------------------
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
# If you add client-side routing, replace the default config with one that does
# `try_files $uri /index.html;` so deep links resolve to the SPA entry point.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
