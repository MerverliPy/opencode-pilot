/**
 * `pilot start` — CLI entry point for the Pilot server.
 *
 * Usage:
 *   npx pilot start [--port 3000] [--opencode-url http://localhost:4096]
 *
 * Environment variables:
 *   PORT            - Server port (default: 3000)
 *   OPENCODE_URL    - Upstream OpenCode server URL
 *   N9ROUTER_URL    - n9router base URL (default: http://localhost:20128/v1)
 *   N9ROUTER_API_KEY - n9router API key (optional for local deployments)
 *
 * .env file: If a .env file exists in the project root, it is loaded automatically
 * to populate environment variables. Explicit env vars take precedence.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { startServer as StartServerFn } from "./index.js";

/**
 * Load .env file from project root (one directory up from server/).
 * Sets process.env variables only if not already set (no override).
 */
function loadDotEnv(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = resolve(__dirname, "..");
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    // Try project root (pilot/)
    const projectRoot = resolve(root, "..");
    const projectEnvPath = resolve(projectRoot, ".env");
    if (!existsSync(projectEnvPath)) return;
    loadEnvFile(projectEnvPath);
    return;
  }
  loadEnvFile(envPath);
}

function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // silently ignore .env read errors
  }
}

export function parseArgs(argv: string[]): { port: number; openCodeUrl?: string } {
  let port = parseInt(process.env.PORT ?? "3000", 10);
  let openCodeUrl = process.env.OPENCODE_URL;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--port" && argv[i + 1]) {
      port = parseInt(argv[++i], 10);
    } else if (arg === "--opencode-url" && argv[i + 1]) {
      openCodeUrl = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Pilot — OpenCode web client server

Usage:
  pilot start [options]

Options:
  --port <port>            Server port (default: 3000, or PORT env var)
  --opencode-url <url>     Upstream OpenCode server URL (or OPENCODE_URL env var)
  -h, --help               Show this help message

Environment variables:
  PORT            Server port (default: 3000)
  OPENCODE_URL    Upstream OpenCode server URL
  N9ROUTER_URL    n9router base URL (default: http://localhost:20128/v1)
  N9ROUTER_API_KEY    n9router API key (optional for local deployments)

A .env file in the project root is loaded automatically.
`);
      process.exit(0);
    }
  }

  if (isNaN(port)) port = 3000;

  return { port, openCodeUrl };
}

// Guard: only run when executed directly, not when imported for testing
if (process.argv[1]?.includes('cli.')) {
  loadDotEnv();
  const { port, openCodeUrl } = parseArgs(process.argv);
  import("./index.js").then(({ startServer }) => startServer(port, openCodeUrl));
}
