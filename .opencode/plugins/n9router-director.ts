import type { Plugin } from "@opencode-ai/plugin";

function textArg(input: unknown, key: string): string {
  const value = (input as any)?.args?.[key];
  return typeof value === "string" ? value : "";
}

const OPENCODE_CONFIG_RE = /(^|\/)opencode\.jsonc?$/;
const N9ROUTER_MODEL_RE = /"model"\s*:\s*"(?!n9router\/)[^"]+"/;

export const N9RouterDirectorPlugin: Plugin = async () => {
  return {
    "session.created": async () => {
      console.log("[n9router] Workflow director active. Primary agent: orchestrator. Model routing should remain on n9router/*.");
    },

    "tool.execute.before": async (input) => {
      const tool = (input as any)?.tool;
      if (tool !== "edit" && tool !== "write") return;

      const filePath = textArg(input, "filePath");
      if (!OPENCODE_CONFIG_RE.test(filePath)) return;

      const content = textArg(input, "content") || textArg(input, "newString") || "";
      if (N9ROUTER_MODEL_RE.test(content)) {
        console.warn("[n9router] Config edit appears to introduce a non-n9router model. Keep n9router/* unless explicitly requested.");
      }
    },
  };
};
