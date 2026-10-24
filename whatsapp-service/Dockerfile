# ============================================================
# Dockerfile para o microserviço whatsapp-service da Prospecta
# Base leve: Node 20 Alpine
# ============================================================

FROM node:20-alpine

# Instalar dependências de sistema necessárias para compilação nativa se preciso e fuso horário
RUN apk add --no-cache tzdata ca-certificates

ENV TZ=Africa/Maputo
ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

# Copiar ficheiros de dependências primeiro para cache do Docker
COPY package*.json ./

# Instalar dependências exatas de produção via lockfile
RUN npm ci --omit=dev --legacy-peer-deps

# Copiar código-fonte
COPY src/ ./src/
COPY schema.sql ./

EXPOSE 3001

# Healthcheck interno do contentor
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
