FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src
RUN bun install
RUN bun run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SEQUENZY_API_URL=https://api.sequenzy.com
# Glama needs the server to start for introspection; real deployments should override this.
ENV SEQUENZY_API_KEY=glama-introspection

COPY package.json server.json README.md ./
COPY --from=builder /app/dist ./dist
RUN npm install --omit=dev --ignore-scripts

ENTRYPOINT ["node", "dist/index.js"]
