/**
 * Shared TypeScript types for the Pilot monorepo.
 *
 * These types define the OpenCode API surface used by both the server proxy
 * and the UI client. Kept hand-written to avoid bundling the Node-targeted SDK.
 */

// ─── Session ──────────────────────────────────────────────────────────────────

export type Session = {
  id: string;
  parentID?: string;
  title: string;
  version: string;
  time: { created: number; updated: number };
  share?: { url: string };
};

export type SessionStatus = "idle" | "busy" | "question" | "error" | "aborted";

export type SessionTags = {
  sessionId: string;
  tags: string[];
  folder: string;
  updatedAt: number;
};

// ─── Provider / Agent / Command ───────────────────────────────────────────────

export type Provider = {
  id: string;
  name: string;
  models: Record<string, { id: string; name: string }>;
};

export type Agent = {
  name: string;
  description?: string;
  mode?: "build" | "plan" | string;
};

export type Command = {
  name: string;
  description?: string;
};

// ─── Files ────────────────────────────────────────────────────────────────────

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
};

export type FileContent = {
  type: "raw" | "patch";
  content: string;
};

export type FileDiff = {
  path: string;
  added: number;
  removed: number;
  diff: string;
};

// ─── Messages & Parts ─────────────────────────────────────────────────────────

export type PartBase = {
  id: string;
  messageID: string;
  sessionID: string;
};

export type TextPart = PartBase & {
  type: "text";
  text: string;
};

export type ReasoningPart = PartBase & {
  type: "reasoning";
  text: string;
};

export type ToolPart = PartBase & {
  type: "tool";
  tool: string;
  state: {
    status: "pending" | "running" | "completed" | "error";
    input?: unknown;
    output?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };
};

export type FilePart = PartBase & {
  type: "file";
  filename?: string;
  mime?: string;
  url?: string;
};

export type StepStartPart = PartBase & { type: "step-start" };
export type StepFinishPart = PartBase & { type: "step-finish" };

export type Part =
  | TextPart
  | ReasoningPart
  | ToolPart
  | FilePart
  | StepStartPart
  | StepFinishPart;

export type Message = {
  id: string;
  sessionID: string;
  role: "user" | "assistant" | "system";
  time: { created: number; completed?: number };
  modelID?: string;
  providerID?: string;
  cost?: number;
  tokens?: { input: number; output: number; reasoning?: number };
};

export type MessageWithParts = { info: Message; parts: Part[] };

// ─── Permissions ─────────────────────────────────────────────────────────────

export type PermissionRequest = {
  id: string;
  sessionID: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

// ─── SSE Events ──────────────────────────────────────────────────────────────

/** Raw event shapes we care about from /event SSE stream. */
export type ServerEvent =
  | { type: "server.connected" }
  | { type: "session.updated"; properties: { info: Session } }
  | { type: "session.deleted"; properties: { info: Session } }
  | { type: "session.idle"; properties: { sessionID: string } }
  | {
      type: "session.error";
      properties: { sessionID: string; error?: unknown };
    }
  | { type: "message.updated"; properties: { info: Message } }
  | {
      type: "message.removed";
      properties: { sessionID: string; messageID: string };
    }
  | { type: "message.part.updated"; properties: { part: Part } }
  | {
      type: "message.part.removed";
      properties: { sessionID: string; messageID: string; partID: string };
    }
  | { type: "permission.requested"; properties: PermissionRequest }
  | {
      type: "permission.replied";
      properties: { id: string; sessionID: string };
    }
  | { type: string; properties?: unknown };

// ─── Server Config ────────────────────────────────────────────────────────────

export type ServerConfig = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  /** Bearer token for CLI/API automation (PILOT_AUTH_TOKEN).
   *  The browser uses httpOnly session cookies for auth, not this field.
   *  Server middleware accepts either a valid session cookie or this bearer token. */
  authToken?: string;
};

// ─── N9Router ────────────────────────────────────────────────────────────────

export type N9RouterConfig = {
  url: string;
  key: string;
};

export type N9RouterModel = {
  id: string;
  object: string;
  owned_by: string;
};

export type N9RouterModelsResponse = {
  object: string;
  data: N9RouterModel[];
};

export type N9RouterRequest = {
  timestamp: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  status: "success" | "error" | string;
};

export type N9RouterUsageStats = {
  recentRequests: N9RouterRequest[];
  [key: string]: unknown;
};

export type N9RouterTunnelStatus = {
  enabled: boolean;
  url?: string;
  shortId?: string;
  [key: string]: unknown;
};

export type ProviderSummary = {
  provider: string;
  requests: number;
  success: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
};

// ─── Auth (P27) ──────────────────────────────────────────────────────────────────

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  ok: boolean;
  username?: string;
  error?: string;
};

export type AuthStatusResponse = {
  authenticated: boolean;
  username?: string;
};
