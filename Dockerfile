FROM node:24-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev --ignore-scripts
COPY server/ ./server/
COPY --from=frontend /build/frontend/dist ./frontend/dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production
ENV PORT=8080
ENV AGENT_DATA_FILE=/app/data/agents.sqlite
EXPOSE 8080
CMD ["node", "server/index.mjs"]
