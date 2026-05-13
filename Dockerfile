# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root configs
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY ui/package.json ui/

# Install all workspace dependencies
RUN npm ci

# Copy source code
COPY shared/ shared/
COPY server/ server/
COPY ui/ ui/

# Build shared types first, then server and UI
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy workspace root configs
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY ui/package.json ui/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts
COPY shared/ shared/
COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/ui/dist ui/dist

# Expose the server port
EXPOSE 3000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "server/dist/cli.js"]