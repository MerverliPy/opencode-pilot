#!/usr/bin/env node
/**
 * n9router bridge for pilot-relay.
 *
 * When NINEROUTER_URL is set, this module:
 *
 *   1. Starts a lightweight HTTP server (default port 4097) that exposes:
 *        GET /n9router/status  → live health + model count + 24h token stats
 *        GET /n9router/health  → simple {"ok":true|false} liveness check
 *
 *   2. Polls n9router every NINEROUTER_POLL_INTERVAL_MS (default 5 min) and
 *      sends an Expo push notification when a provider appears quota-exhausted
 *      (>= QUOTA_FAIL_THRESHOLD percent of its last N requests failed).
 *
 * Configuration (env vars):
 *
 *   NINEROUTER_URL              Required. e.g. http://localhost:20128
 *   NINEROUTER_KEY              Optional. Bearer token for n9router auth.
 *   PILOT_BRIDGE_PORT           Optional. HTTP port for this bridge. Default: 4097.
 *   NINEROUTER_POLL_INTERVAL_MS Optional. Default: 300000 (5 min).
 *   NINEROUTER_QUOTA_THRESHOLD  Optional. Failure ratio that triggers push [0-1]. Default: 0.8.
 *
 * This module is intended to be imported by relay.js, which supplies the
 * `send` push function and the set of valid Expo tokens.
 */

import http from "node:http";

// ─── Config ──────────────────────────────────────────────────────────────────

const N9R_URL = (process.env.NINEROUTER_URL || "").replace(/\/$/, "");
const N9R_KEY = process.env.NINEROUTER_KEY || "";
const BRIDGE_PORT = parseInt(process.env.PILOT_BRIDGE_PORT || "4097", 10);
const POLL_MS = parseInt(
  process.env.NINEROUTER_POLL_INTERVAL_MS || "300000",
  10,
);
const QUOTA_THRESHOLD = parseFloat(
  process.env.NINEROUTER_QUOTA_THRESHOLD || "0.8",
);

// How many recent requests to inspect for each provider when detecting failures
const FAILURE_WINDOW = 10;

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ ok: boolean, modelCount: number, stats: any, checkedAt: string | null }} */
let cachedStatus = { ok: false, modelCount: 0, stats: null, checkedAt: null };

/** Track which providers we've already alerted on to avoid repeat pushes */
const alertedProviders = new Set();

// ─── n9router fetch helpers ───────────────────────────────────────────────────

function n9rHeaders() {
  const h = { "Content-Type": "application/json" };
  if (N9R_KEY) h["Authorization"] = `Bearer ${N9R_KEY}`;
  return h;
}

async function n9rFetch(path, timeoutMs = 5000) {
  const url = `${N9R_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: n9rHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Status refresh ───────────────────────────────────────────────────────────

async function refreshStatus() {
  try {
    // Health
    const health = await n9rFetch("/api/health");

    // Model list
    let modelCount = 0;
    try {
      const models = await n9rFetch("/v1/models");
      modelCount = Array.isArray(models?.data) ? models.data.length : 0;
    } catch {
      /* non-fatal */
    }

    // Usage stats (24h window)
    let stats = null;
    try {
      stats = await n9rFetch("/api/usage/stats?period=24h");
    } catch {
      /* non-fatal */
    }

    cachedStatus = {
      ok: health?.ok === true,
      modelCount,
      stats,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    cachedStatus = {
      ok: false,
      modelCount: 0,
      stats: null,
      checkedAt: new Date().toISOString(),
    };
    console.warn("[n9r-bridge] status refresh failed:", err.message);
  }
}

// ─── Quota check + push alerts ────────────────────────────────────────────────

/**
 * Inspect the usage stats for providers with high failure rates.
 * @param {Function} sendPush  The relay's send(title, body, data) function.
 */
async function checkQuotas(sendPush) {
  if (!cachedStatus.stats) return;

  const { recentRequests } = cachedStatus.stats;
  if (!Array.isArray(recentRequests) || recentRequests.length === 0) return;

  // Group last FAILURE_WINDOW requests per provider
  const byProvider = new Map();
  for (const req of recentRequests) {
    const p = req.provider || "unknown";
    if (!byProvider.has(p)) byProvider.set(p, []);
    byProvider.get(p).push(req);
  }

  for (const [provider, requests] of byProvider) {
    const window = requests.slice(0, FAILURE_WINDOW);
    const failures = window.filter(
      (r) => r.status && r.status !== "ok" && r.status !== "200 OK",
    ).length;
    const ratio = failures / window.length;

    if (ratio >= QUOTA_THRESHOLD) {
      if (!alertedProviders.has(provider)) {
        alertedProviders.add(provider);
        const pct = Math.round(ratio * 100);
        console.warn(
          `[n9r-bridge] quota alert: ${provider} ${pct}% failures → pushing`,
        );
        try {
          await sendPush(
            "n9router: quota alert",
            `${provider} — ${pct}% of recent requests failed. Provider may be rate-limited or quota-exhausted.`,
            { source: "n9router", provider, failureRatio: ratio },
          );
        } catch (e) {
          console.warn("[n9r-bridge] push failed:", e.message);
        }
      }
    } else {
      // Recovery — allow future alerts if provider recovers then fails again
      alertedProviders.delete(provider);
    }
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${BRIDGE_PORT}`);

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }

    if (url.pathname === "/n9router/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: cachedStatus.ok,
          checkedAt: cachedStatus.checkedAt,
        }),
      );
      return;
    }

    if (url.pathname === "/n9router/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: cachedStatus.ok,
          url: N9R_URL,
          modelCount: cachedStatus.modelCount,
          stats: cachedStatus.stats,
          checkedAt: cachedStatus.checkedAt,
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.on("error", (err) => {
    console.error("[n9r-bridge] server error:", err.message);
  });

  server.listen(BRIDGE_PORT, "0.0.0.0", () => {
    console.log(
      `[n9r-bridge] listening on :${BRIDGE_PORT} — /n9router/status /n9router/health`,
    );
  });

  return server;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the n9router bridge.
 * @param {{ send: Function }} opts  `send` is the relay push function.
 * @returns {http.Server}
 */
export async function startBridge({ send }) {
  if (!N9R_URL) {
    console.log("[n9r-bridge] NINEROUTER_URL not set — bridge disabled");
    return null;
  }

  console.log(`[n9r-bridge] connecting to ${N9R_URL}, poll every ${POLL_MS}ms`);

  // Initial status fetch
  await refreshStatus();

  // Start the HTTP server
  const server = startServer();

  // Polling loop: refresh status + check quotas
  setInterval(async () => {
    await refreshStatus();
    await checkQuotas(send);
  }, POLL_MS);

  return server;
}
