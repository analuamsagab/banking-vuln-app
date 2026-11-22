# Build frontend
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    LAB_HOST=0.0.0.0 \
    LAB_PROFILE=extreme \
    DATA_DIR=/app/data \
    PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY server ./server
COPY scripts ./scripts

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
