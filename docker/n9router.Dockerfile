# ─── n9router from npm ─────────────────────────────────────────────────────
# Self-contained image that installs n9router from npm and runs the
# pre-built Next.js standalone server bundled inside the package.
#
# Build:  docker compose -f docker/docker-compose.yml build
# Run:    docker compose -f docker/docker-compose.yml up -d
# Health: curl http://localhost:20128/api/health
#
# Accessible via:
#   - localhost:20128 (local)
#   - 100.81.83.98:20128 (Tailscale)

FROM node:20-alpine

ARG N9ROUTER_VERSION=0.4.30

# Install n9router globally (includes pre-built Next.js standalone server)
RUN npm install -g n9router@${N9ROUTER_VERSION}

# Data directory for persistent storage
ENV DATA_DIR=/data
RUN mkdir -p /data

# n9router defaults
ENV PORT=20128
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 20128

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:20128/api/health || exit 1

CMD ["n9router"]
