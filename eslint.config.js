import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      "server/dist/",
      "ui/dist/",
      ".opencode/",
      "n9router-master/",
    ],
  },

  // Base JS/TS rules (applies to all workspaces)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // UI workspace — React + TypeScript
  {
    files: ["ui/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Server workspace — Node.js TypeScript
  {
    files: ["server/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Shared workspace — TypeScript
  {
    files: ["shared/src/**/*.ts"],
  },
);
