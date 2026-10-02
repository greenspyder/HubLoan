FROM node:24-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

FROM alpine:3.22 AS butler
RUN apk add --no-cache curl unzip && curl -fsSL --retry 2 https://github.com/itchio/butler/releases/download/v15.31.0/butler-linux-amd64.zip -o /tmp/butler.zip \
 && echo '1e536377187894ef5fe7f35edfb29df256df63e50e7f6b97ebd54bc5aba4c055  /tmp/butler.zip' | sha256sum -c - \
 && unzip /tmp/butler.zip -d /opt && chmod +x /opt/linux-amd64/butler

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=butler /opt/linux-amd64/ /opt/butler/
ENV BUTLER_PATH=/opt/butler/butler
RUN /opt/butler/butler version
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
