import { useSessionStore } from "../session";
import type {
  Message,
  Part,
  PermissionRequest,
  Session,
} from "../../services/types";

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it("has correct defaults", () => {
    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.status).toBe("idle");
    expect(state.turns).toEqual([]);
    expect(state.modelID).toBeNull();
    expect(state.providerID).toBeNull();
    expect(state.agent).toBe("build");
    expect(state.permissions).toEqual([]);
    expect(state.workdir).toBeNull();
  });

  describe("setSession", () => {
    it("sets the current session", () => {
      const session: Session = {
        id: "ses_123",
        title: "Test",
        version: "1",
        time: { created: Date.now(), updated: Date.now() },
      };
      useSessionStore.getState().setSession(session);
      expect(useSessionStore.getState().session).toEqual(session);
    });

    it("sets null session", () => {
      useSessionStore.getState().setSession(null);
      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe("updateTitle", () => {
    it("updates session title immutably", () => {
      const session: Session = {
        id: "ses_123",
        title: "Old",
        version: "1",
        time: { created: 0, updated: 0 },
      };
      useSessionStore.getState().setSession(session);
      useSessionStore.getState().updateTitle("New");
      expect(useSessionStore.getState().session?.title).toBe("New");
    });

    it("no-op when no session", () => {
      useSessionStore.getState().updateTitle("New");
      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      useSessionStore.getState().setSession({
        id: "ses_123",
        title: "Test",
        version: "1",
        time: { created: 0, updated: 0 },
      });
      useSessionStore.getState().setStatus("busy");
      useSessionStore.getState().reset();
      const state = useSessionStore.getState();
      expect(state.session).toBeNull();
      expect(state.status).toBe("idle");
      expect(state.turns).toEqual([]);
    });
  });

  describe("setStatus / setModel / setAgent / setWorkdir", () => {
    it("sets status", () => {
      useSessionStore.getState().setStatus("busy");
      expect(useSessionStore.getState().status).toBe("busy");
    });

    it("sets model", () => {
      useSessionStore.getState().setModel("openai", "gpt-4");
      expect(useSessionStore.getState().providerID).toBe("openai");
      expect(useSessionStore.getState().modelID).toBe("gpt-4");
    });

    it("sets agent", () => {
      useSessionStore.getState().setAgent("test");
      expect(useSessionStore.getState().agent).toBe("test");
    });

    it("sets workdir", () => {
      useSessionStore.getState().setWorkdir("/home/user");
      expect(useSessionStore.getState().workdir).toBe("/home/user");
    });
  });

  describe("hydrateTurns", () => {
    it("replaces all turns", () => {
      const turns = [
        {
          message: {
            id: "m1",
            sessionID: "ses_123",
            role: "user",
            time: { created: 0 },
          } as Message,
          parts: [],
        },
      ];
      useSessionStore.getState().hydrateTurns(turns);
      expect(useSessionStore.getState().turns).toEqual(turns);
    });
  });

  describe("upsertMessage", () => {
    it("adds new message as new turn", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "user",
        time: { created: 0 },
      };
      useSessionStore.getState().upsertMessage(msg);
      expect(useSessionStore.getState().turns).toHaveLength(1);
      expect(useSessionStore.getState().turns[0].message.id).toBe("m1");
    });

    it("updates existing message", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "user",
        time: { created: 0 },
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().upsertMessage({ ...msg, role: "assistant" });
      expect(useSessionStore.getState().turns[0].message.role).toBe(
        "assistant",
      );
    });
  });

  describe("upsertPart", () => {
    it("adds part to existing message", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "assistant",
        time: { created: 0 },
      };
      const part: Part = {
        id: "p1",
        messageID: "m1",
        sessionID: "ses_123",
        type: "text",
        text: "hello",
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().upsertPart(part);
      expect(useSessionStore.getState().turns[0].parts).toHaveLength(1);
      expect((useSessionStore.getState().turns[0].parts[0] as any).text).toBe(
        "hello",
      );
    });

    it("creates placeholder turn when message not yet present", () => {
      const part: Part = {
        id: "p1",
        messageID: "m1",
        sessionID: "ses_123",
        type: "text",
        text: "hello",
      };
      useSessionStore.getState().upsertPart(part);
      const turn = useSessionStore.getState().turns[0];
      expect(turn.message.id).toBe("m1");
      expect(turn.message.role).toBe("assistant");
      expect((turn.parts[0] as any).text).toBe("hello");
    });

    it("updates existing part", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "assistant",
        time: { created: 0 },
      };
      const part: Part = {
        id: "p1",
        messageID: "m1",
        sessionID: "ses_123",
        type: "text",
        text: "hello",
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().upsertPart(part);
      useSessionStore.getState().upsertPart({ ...part, text: "world" });
      expect((useSessionStore.getState().turns[0].parts[0] as any).text).toBe(
        "world",
      );
    });
  });

  describe("removeMessage", () => {
    it("removes matching turn", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "user",
        time: { created: 0 },
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().removeMessage("ses_123", "m1");
      expect(useSessionStore.getState().turns).toHaveLength(0);
    });

    it("does not remove non-matching turn", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "user",
        time: { created: 0 },
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().removeMessage("ses_123", "m2");
      expect(useSessionStore.getState().turns).toHaveLength(1);
    });
  });

  describe("removePart", () => {
    it("removes matching part", () => {
      const msg: Message = {
        id: "m1",
        sessionID: "ses_123",
        role: "assistant",
        time: { created: 0 },
      };
      const part: Part = {
        id: "p1",
        messageID: "m1",
        sessionID: "ses_123",
        type: "text",
        text: "hello",
      };
      useSessionStore.getState().upsertMessage(msg);
      useSessionStore.getState().upsertPart(part);
      useSessionStore.getState().removePart("ses_123", "m1", "p1");
      expect(useSessionStore.getState().turns[0].parts).toHaveLength(0);
    });
  });

  describe("pushPermission", () => {
    it("adds permission", () => {
      const perm: PermissionRequest = {
        id: "perm_1",
        sessionID: "ses_123",
        type: "PILOT_PERMISSION",
        title: "Allow action?",
      };
      useSessionStore.getState().pushPermission(perm);
      expect(useSessionStore.getState().permissions).toContainEqual(perm);
    });

    it("does not duplicate permissions", () => {
      const perm: PermissionRequest = {
        id: "perm_1",
        sessionID: "ses_123",
        type: "PILOT_PERMISSION",
        title: "Allow action?",
      };
      useSessionStore.getState().pushPermission(perm);
      useSessionStore.getState().pushPermission(perm);
      expect(useSessionStore.getState().permissions).toHaveLength(1);
    });
  });

  describe("resolvePermission", () => {
    it("removes permission by id", () => {
      const perm: PermissionRequest = {
        id: "perm_1",
        sessionID: "ses_123",
        type: "PILOT_PERMISSION",
        title: "Allow action?",
      };
      useSessionStore.getState().pushPermission(perm);
      useSessionStore.getState().resolvePermission("perm_1");
      expect(useSessionStore.getState().permissions).toHaveLength(0);
    });
  });
});
