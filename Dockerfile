FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run build:mcp

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/VERSION ./
COPY --from=build /app/lib/db/migrations ./lib/db/migrations

RUN mkdir -p content/posts content/media data

EXPOSE 3000
EXPOSE 3456
CMD ["node_modules/.bin/next", "start"]
