# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools required for native modules (node-pty, better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy workspace root configs
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY ui/package.json ui/

# Install all workspace dependencies (compiles native modules here)
RUN npm ci

# Copy source code
COPY shared/ shared/
COPY server/ server/
COPY ui/ ui/

# Build shared types first, then server and UI
RUN npm run build

# Prune dev dependencies so only production deps are copied to runner
RUN npm prune --production

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package.json files (needed for Node.js ESM "type": "module" resolution)
COPY package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY ui/package.json ui/

# Copy production node_modules from builder (native modules already compiled)
COPY --from=builder /app/node_modules ./node_modules

# Copy the shared package build output — workspace symlinks in node_modules
# (node_modules/@MerverliPy/pilot-shared -> ../../shared) resolve to this path
COPY --from=builder /app/shared/dist shared/dist

# Copy built artifacts
COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/ui/dist ui/dist

# Expose the server port
EXPOSE 3000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "server/dist/cli.js"]
