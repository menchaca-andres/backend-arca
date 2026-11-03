# Se construye desde la raiz del repo: necesita packages/shared
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --workspace=@arca/shared --workspace=ms-vacaciones --include-workspace-root
RUN npm run build --workspace=@arca/shared --workspace=ms-vacaciones

FROM node:22-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm pkg delete scripts.prepare --workspace=@arca/shared && npm ci --omit=dev --workspace=@arca/shared --workspace=ms-vacaciones
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/ms-vacaciones/dist ./services/ms-vacaciones/dist
EXPOSE 3003
CMD ["node", "services/ms-vacaciones/dist/server.js"]
