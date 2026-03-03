# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
# Compile server TypeScript to JavaScript
RUN npx tsc -p tsconfig.server.json

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copy built frontend and compiled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.js ./server/
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "server/index.js"]
