import { create } from "zustand";
import type {
  Message,
  Part,
  PermissionRequest,
  Session,
  SessionStatus,
} from "@/services/types";

export type Turn = {
  message: Message;
  parts: Part[];
};

type SessionState = {
  session: Session | null;
  status: SessionStatus;
  turns: Turn[];
  modelID: string | null;
  providerID: string | null;
  agent: string;
  permissions: PermissionRequest[];
  workdir: string | null;

  setSession: (s: Session | null) => void;
  reset: () => void;
  setStatus: (s: SessionStatus) => void;
  setModel: (providerID: string | null, modelID: string | null) => void;
  setAgent: (agent: string) => void;
  setWorkdir: (path: string | null) => void;

  /** Replace all turns from a fresh GET. */
  hydrateTurns: (turns: Turn[]) => void;

  /** Upsert message info from `message.updated` event. */
  upsertMessage: (m: Message) => void;

  /** Upsert a single part from `message.part.updated`. */
  upsertPart: (p: Part) => void;

  removeMessage: (sessionID: string, messageID: string) => void;
  removePart: (sessionID: string, messageID: string, partID: string) => void;

  pushPermission: (p: PermissionRequest) => void;
  resolvePermission: (id: string) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  status: "idle",
  turns: [],
  modelID: null,
  providerID: null,
  agent: "build",
  permissions: [],
  workdir: null,

  setSession: (session) => set({ session }),

  reset: () =>
    set({
      session: null,
      status: "idle",
      turns: [],
      modelID: null,
      providerID: null,
      permissions: [],
      workdir: null,
    }),

  setStatus: (status) => set({ status }),
  setModel: (providerID, modelID) => set({ providerID, modelID }),
  setAgent: (agent) => set({ agent }),
  setWorkdir: (workdir) => set({ workdir }),

  hydrateTurns: (turns) => set({ turns }),

  upsertMessage: (m) =>
    set((state) => {
      const idx = state.turns.findIndex((t) => t.message.id === m.id);
      if (idx >= 0) {
        const turns = state.turns.slice();
        turns[idx] = { ...turns[idx], message: m };
        return { turns };
      }
      return { turns: [...state.turns, { message: m, parts: [] }] };
    }),

  upsertPart: (p) =>
    set((state) => {
      const idx = state.turns.findIndex((t) => t.message.id === p.messageID);
      if (idx < 0) {
        // Message hasn't arrived yet — stash in a placeholder turn.
        const placeholder: Message = {
          id: p.messageID,
          sessionID: p.sessionID,
          role: "assistant",
          time: { created: Date.now() },
        };
        return {
          turns: [...state.turns, { message: placeholder, parts: [p] }],
        };
      }
      const turn = state.turns[idx];
      const partIdx = turn.parts.findIndex((x) => x.id === p.id);
      const nextParts =
        partIdx >= 0
          ? turn.parts.map((x, i) => (i === partIdx ? p : x))
          : [...turn.parts, p];
      const turns = state.turns.slice();
      turns[idx] = { ...turn, parts: nextParts };
      return { turns };
    }),

  removeMessage: (sessionID, messageID) =>
    set((state) => ({
      turns: state.turns.filter(
        (t) => t.message.id !== messageID || t.message.sessionID !== sessionID,
      ),
    })),

  removePart: (sessionID, messageID, partID) =>
    set((state) => {
      const turns = state.turns.map((t) => {
        if (t.message.id !== messageID) return t;
        return { ...t, parts: t.parts.filter((p) => p.id !== partID) };
      });
      return { turns };
    }),

  pushPermission: (p) =>
    set((state) => ({
      permissions: state.permissions.some((x) => x.id === p.id)
        ? state.permissions
        : [...state.permissions, p],
    })),

  resolvePermission: (id) =>
    set((state) => ({
      permissions: state.permissions.filter((p) => p.id !== id),
    })),
}));
