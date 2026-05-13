import type { Plugin } from "@opencode-ai/plugin";

const DESTRUCTIVE = /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+clean\s+-fd|git\s+push\s+--force|drop\s+table|truncate\s+table)\b/i;
const DEV_SERVER = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?dev\b/i;
const INSTALL = /\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/i;

function arg(input: unknown, key: string): string | undefined {
  const args = (input as any)?.args;
  const value = args?.[key];
  return typeof value === "string" ? value : undefined;
}

export const ToolGuardrailsPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input) => {
      if (!input || !(input as any).tool) return;

      if ((input as any).tool === "bash") {
        const command = arg(input, "command") ?? "";
        if (!command) return;

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

      if ((input as any).tool === "write") {
        const filePath = arg(input, "filePath") ?? "";
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
