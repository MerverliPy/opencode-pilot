#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    url: process.env.E2E_BASE_URL || "http://localhost:43173",
    out: "dogfood-output/visual-functional-audit",
    soft: false,
    routes: "",
    headed: false,
    debug: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];

    if (value === "--help" || value === "-h") {
      args.help = true;
    } else if (value === "--soft") {
      args.soft = true;
    } else if (value === "--headed") {
      args.headed = true;
    } else if (value === "--debug") {
      args.debug = true;
    } else if (value === "--url") {
      args.url = argv[++i] || args.url;
    } else if (value.startsWith("--url=")) {
      args.url = value.slice("--url=".length);
    } else if (value === "--out") {
      args.out = argv[++i] || args.out;
    } else if (value.startsWith("--out=")) {
      args.out = value.slice("--out=".length);
    } else if (value === "--routes") {
      args.routes = argv[++i] || "";
    } else if (value.startsWith("--routes=")) {
      args.routes = value.slice("--routes=".length);
    } else {
      console.error(`Unknown argument: ${value}`);
      process.exit(2);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Pilot visual functional audit runner

Usage:
  npm run qa:visual-functional -- --url http://localhost:43173 --soft

Options:
  --url <url>        Target UI URL. Default: http://localhost:43173
  --out <dir>        Output directory. Default: dogfood-output/visual-functional-audit
  --routes <csv>     Optional route CSV, e.g. /,/chat,/settings
  --soft             Do not fail process on P0/P1 findings
  --headed           Run Playwright headed
  --debug            Run Playwright debug mode
  --help             Show help
`);
}

function inferUiPort(url) {
  try {
    const parsed = new URL(url);
    if (!["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      return "";
    }

    // Only override E2E_UI_PORT when the caller supplied an explicit URL port.
    // Do not infer 80/443 from protocol because that can override the repo's
    // configured dev-server port and make Playwright bind to privileged ports.
    return parsed.port || "";
  } catch {
    return "";
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!existsSync("package.json") || !existsSync("e2e/package.json")) {
  console.error("ERROR: run this command from the Pilot repo root.");
  process.exit(1);
}

const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });

const metadata = {
  createdAt: new Date().toISOString(),
  url: args.url,
  outDir,
  soft: args.soft,
  routes: args.routes || "default",
};

writeFileSync(
  resolve(outDir, "run-metadata.json"),
  JSON.stringify(metadata, null, 2) + "\n",
);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const playwrightArgs = [
  "run",
  "test",
  "-w",
  "e2e",
  "--",
  "tests/visual/mobile-clickable-audit.spec.ts",
  "--reporter=list",
];

if (args.headed) {
  playwrightArgs.push("--headed");
}

if (args.debug) {
  playwrightArgs.push("--debug");
}

const env = {
  ...process.env,
  E2E_BASE_URL: args.url,
  VISUAL_AUDIT_OUT: outDir,
  VISUAL_AUDIT_SOFT: args.soft ? "1" : process.env.VISUAL_AUDIT_SOFT || "",
  VISUAL_FUNCTIONAL_AUDIT: "1",
};

const inferredPort = inferUiPort(args.url);
if (inferredPort) {
  env.E2E_UI_PORT = inferredPort;
}

if (args.routes) {
  env.VISUAL_AUDIT_ROUTES = args.routes;
}

console.log("Running Pilot visual functional audit");
console.log(`Target URL: ${args.url}`);
console.log(`Output dir: ${outDir}`);
console.log(`Soft mode: ${args.soft ? "on" : "off"}`);
console.log("");

const result = spawnSync(npmCommand, playwrightArgs, {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
