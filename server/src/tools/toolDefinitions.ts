/**
 * Tool definitions for Pilot chat function calling.
 * OpenAI-compatible function calling format.
 */

export interface ToolParameterSchema {
  type: string;
  description: string;
  enum?: string[];
  items?: ToolParameterSchema;
}

export interface ToolFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameterSchema>;
    required: string[];
  };
}

export interface ToolDefinition {
  type: "function";
  function: ToolFunctionDefinition;
}

/**
 * Tool: read_file - Read contents of a file.
 */
const READ_FILE: ToolDefinition = {
  type: "function",
  function: {
    name: "read_file",
    description: "Read contents of a file. Returns file content up to 100KB. Specify offset and limit to read partial content.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root (e.g. server/src/index.ts)",
        },
        offset: {
          type: "number",
          description: "Starting line number (0-indexed, optional)",
        },
        limit: {
          type: "number",
          description: "Maximum lines to return (optional, default all)",
        },
      },
      required: ["path"],
    },
  },
};

/**
 * Tool: search_code - Search codebase with regex pattern.
 */
const SEARCH_CODE: ToolDefinition = {
  type: "function",
  function: {
    name: "search_code",
    description: "Search codebase using regex pattern. Returns matching files with line numbers and content snippets. Max 50 results.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        include: {
          type: "string",
          description: "File glob pattern to filter (e.g. *.ts, *.{ts,tsx})",
        },
        path: {
          type: "string",
          description: "Subdirectory to search in (relative to project root, optional)",
        },
      },
      required: ["pattern"],
    },
  },
};

/**
 * Tool: list_directory - List files and directories.
 */
const LIST_DIRECTORY: ToolDefinition = {
  type: "function",
  function: {
    name: "list_directory",
    description: "List files and directories at a path. Shows names and types (file/dir).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to project root (e.g. server/src). Defaults to root.",
        },
      },
      required: [],
    },
  },
};

/**
 * Tool: get_project_tree - Show project directory tree.
 */
const GET_PROJECT_TREE: ToolDefinition = {
  type: "function",
  function: {
    name: "get_project_tree",
    description: "Show project directory tree structure. Shows nested files and folders up to specified depth.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Root path relative to project root (optional, defaults to root)",
        },
        depth: {
          type: "number",
          description: "Maximum tree depth (optional, default 2, max 5)",
        },
      },
      required: [],
    },
  },
};

/** All available tools for chat completions. */
export const TOOLS: ToolDefinition[] = [
  READ_FILE,
  SEARCH_CODE,
  LIST_DIRECTORY,
  GET_PROJECT_TREE,
];

/** Default system prompt describing Pilot repo for context. */
export const SYSTEM_PROMPT = `You are a helpful coding assistant for the Pilot project.

## About Pilot
Pilot is a TypeScript monorepo for an OpenCode PWA web client. It includes:
- \`server/\`: Hono + Node server with terminal/session/proxy/tunnel APIs, SQLite-backed memory modules
- \`ui/\`: React + Vite PWA, Zustand stores, CodeMirror/xterm UI, Jest tests
- \`shared/\`: shared TypeScript types
- \`e2e/\`: Playwright end-to-end tests

## Your capabilities
You have access to the repository's files. Use the available tools to read files, search code, list directories, and explore the project structure. Answer questions about the codebase by reading the relevant files.

Always read the relevant source files before answering code questions. Be thorough and reference specific file paths and line numbers.

## Tool usage
To read files, use the 'read_file' tool. To search code, use 'search_code' with regex patterns. Use 'list_directory' to explore folders. Use 'get_project_tree' for the project structure.

## Response format - CRITICAL
Your response must be plain text readable by a developer without XML parsing. Follow these rules:

1. NEVER output XML tool call blocks like <tool_calls>, <invoke>, <use_mcp_tool>, <result>, or similar tags.
2. Describe tool usage in plain English, never XML.
   - BAD: <invoke name="read_file"><parameter name="path">foo.ts</parameter></invoke>
   - GOOD: I read the file 'foo.ts' and found that...
3. Use Markdown code blocks (triple backticks) for code, never XML tags.
4. Reference file paths inline with backticks like \`server/src/index\.ts\`.
5. XML tags in your response will be displayed as raw broken text to the user.

Remember: Your entire output is plain text for the user. No XML. Ever.
`;