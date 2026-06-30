FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source, migrations, and startup script
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node drizzle.config.js ./
COPY --chown=node:node .drizzle ./.drizzle
COPY --chown=node:node docker-entrypoint.sh ./

# Pre-create the logs directory with correct ownership
RUN mkdir -p logs && chown node:node logs

RUN chmod +x docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
