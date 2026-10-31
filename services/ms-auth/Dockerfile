# Se construye desde la raiz del repo: necesita packages/shared
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --workspace=@arca/shared --workspace=ms-auth --include-workspace-root
RUN npm run build --workspace=@arca/shared --workspace=ms-auth

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm pkg delete scripts.prepare --workspace=@arca/shared && npm ci --omit=dev --workspace=@arca/shared --workspace=ms-auth
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/ms-auth/dist ./services/ms-auth/dist
EXPOSE 3001
CMD ["node", "services/ms-auth/dist/server.js"]
