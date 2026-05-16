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
 */
import type { startServer as StartServerFn } from "./index.js";

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
`);
      process.exit(0);
    }
  }

  if (isNaN(port)) port = 3000;

  return { port, openCodeUrl };
}

// Guard: only run when executed directly, not when imported for testing
if (process.argv[1]?.includes('cli.')) {
  const { port, openCodeUrl } = parseArgs(process.argv);
  import("./index.js").then(({ startServer }) => startServer(port, openCodeUrl));
}
