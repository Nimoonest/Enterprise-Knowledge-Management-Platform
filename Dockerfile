FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node . .
RUN mkdir -p /app/data/audit /app/runtime && chown -R node:node /app/data/audit /app/runtime

USER node
EXPOSE 5178
CMD ["node", "server.js"]
