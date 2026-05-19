import type { Plugin } from "@opencode-ai/plugin";

const DESTRUCTIVE = /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-fd|git\s+push\s+--force|drop\s+table|truncate\s+table)\b/i;
const DEV_SERVER = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?dev\b/i;
const INSTALL = /\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/i;
const SECRET_PATH = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa|id_ed25519|\.npmrc|\.pypirc)$/i;
const SECRET_BASH_READ = /\b(cat|less|more|head|tail|sed|awk|grep|rg|perl|python|node)\b[^\n;|&]*(^|\s)(\.env(\..*)?|[^\s]*\.(pem|key)|id_rsa|id_ed25519|\.npmrc|\.pypirc)\b/i;
const SECRET_BASH_WRITE = />\s*(\.env(\..*)?|[^\s]*\.(pem|key)|id_rsa|id_ed25519|\.npmrc|\.pypirc)\b/i;

function arg(input: unknown, key: string): string | undefined {
  const args = (input as any)?.args;
  const value = args?.[key];
  return typeof value === "string" ? value : undefined;
}

function pathArg(input: unknown): string {
  return arg(input, "filePath") ?? arg(input, "path") ?? arg(input, "filepath") ?? "";
}

function isExampleSecretPath(filePath: string): boolean {
  return /(^|\/)(\.env\.example|\.env\.sample|env\.example|.*\.example)$/i.test(filePath);
}

function assertNotSecretPath(filePath: string, action: string): void {
  if (!filePath || isExampleSecretPath(filePath)) return;
  if (SECRET_PATH.test(filePath)) {
    throw new Error(
      `[Guardrails] Secret ${action} blocked for ${filePath}. Use a redacted example file such as .env.example instead.`,
    );
  }
}

function assertNoSecretBash(command: string): void {
  if (!command) return;
  if (/\.env\.example|\.env\.sample|env\.example/i.test(command)) return;
  if (SECRET_BASH_READ.test(command) || SECRET_BASH_WRITE.test(command)) {
    throw new Error(
      "[Guardrails] Secret file command blocked. Do not read or write .env, key, pem, npmrc, or private key files; use redacted examples instead.",
    );
  }
}

export const ToolGuardrailsPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input) => {
      if (!input || !(input as any).tool) return;

      if ((input as any).tool === "bash") {
        const command = arg(input, "command") ?? "";
        if (!command) return;

        assertNoSecretBash(command);

        if (DESTRUCTIVE.test(command)) {
          throw new Error(
            "[Guardrails] Destructive command blocked. Ask the user for explicit approval and explain the rollback plan first.",
          );
        }

        if (DEV_SERVER.test(command) && !process.env.TMUX) {
          throw new Error(
            "[Guardrails] Long-running dev servers must run in tmux so logs remain accessible. Example: tmux new-session -d -s pilot-dev \"npm run dev\"",
          );
        }

        if (INSTALL.test(command)) {
          console.warn("[Guardrails] Dependency changes should be minimal and justified in the final summary.");
        }
      }

      if (["read", "write", "edit"].includes((input as any).tool)) {
        assertNotSecretPath(pathArg(input), (input as any).tool);
      }

      if ((input as any).tool === "write") {
        const filePath = pathArg(input);
        if (!filePath) return;

        const markdown = /\.(md|txt)$/i.test(filePath);
        const allowedDoc = /(^|\/)(README|AGENTS|N9ROUTER|CHANGELOG|CONTRIBUTING|TASKS|ROADMAP|DESIGN|BENCH)\.md$/i.test(filePath);
        const allowedDir = /(^|\/)(\.opencode|docs|codemaps)\//.test(filePath);

        if (markdown && !allowedDoc && !allowedDir) {
          throw new Error(
            "[Guardrails] Documentation sprawl blocked. Update an existing source-of-truth doc or use docs/ or codemaps/.",
          );
        }
      }
    },
  };
};
