# ==============================================================================
# ParkVision Frontend — Multi-stage Dockerfile (Vue 3 + TypeScript + Vite + Nginx)
# ==============================================================================

# --- Stage 1: Build the Vue application ---
FROM node:20-alpine AS build
WORKDIR /app

# Enable corepack to use pnpm matching the project's lockfile
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_GOOGLE_MAPS_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY

RUN pnpm build

# --- Stage 2: Serve static files with NGINX ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
