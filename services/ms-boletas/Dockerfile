# Se construye desde la raiz del repo: necesita packages/shared
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --workspace=@arca/shared --workspace=ms-boletas --include-workspace-root
RUN npm run build --workspace=@arca/shared --workspace=ms-boletas

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm pkg delete scripts.prepare --workspace=@arca/shared && npm ci --omit=dev --workspace=@arca/shared --workspace=ms-boletas
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/ms-boletas/dist ./services/ms-boletas/dist
EXPOSE 3005
CMD ["node", "services/ms-boletas/dist/server.js"]
