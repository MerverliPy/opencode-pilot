import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock node-pty
jest.mock("node-pty", () => ({
  spawn: jest.fn(() => {
    const listeners: Record<string, Array<(data: unknown) => void>> = {};
    return {
      onData: (cb: (data: string) => void) => {
        listeners["data"] = [cb as (data: unknown) => void];
      },
      onExit: (cb: (e: { exitCode: number }) => void) => {
        listeners["exit"] = [cb as (data: unknown) => void];
      },
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
    };
  }),
}));

import { createPtySession, listSessions, killSession } from "../terminal.js";
import * as pty from "node-pty";

const mockPty = pty as jest.Mocked<typeof pty>;

describe("terminal session management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear internal sessions by killing all
    for (const s of listSessions()) {
      killSession(s.id);
    }
  });

  it("createPtySession returns a session id", () => {
    const id = createPtySession();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("createPtySession spawns a pty", () => {
    createPtySession();
    expect(mockPty.spawn).toHaveBeenCalledTimes(1);
  });

  it("listSessions returns created sessions", () => {
    const id = createPtySession();
    const sessions = listSessions();
    expect(sessions.some((s) => s.id === id)).toBe(true);
  });

  it("listSessions returns empty after all killed", () => {
    createPtySession();
    createPtySession();
    for (const s of listSessions()) {
      killSession(s.id);
    }
    expect(listSessions()).toHaveLength(0);
  });

  it("killSession returns true for existing session", () => {
    const id = createPtySession();
    expect(killSession(id)).toBe(true);
  });

  it("killSession returns false for non-existent session", () => {
    expect(killSession("nonexistent")).toBe(false);
  });

  it("killSession kills the pty process", () => {
    createPtySession();
    const mockInstance = (mockPty.spawn as jest.Mock).mock.results[0].value as {
      kill: jest.Mock;
    };
    // killSession will call kill on the pty instance
    const sessions = listSessions();
    killSession(sessions[0].id);
    expect(mockInstance.kill).toHaveBeenCalled();
  });

  it("createPtySession returns unique ids", () => {
    const id1 = createPtySession();
    const id2 = createPtySession();
    expect(id1).not.toBe(id2);
  });
});
