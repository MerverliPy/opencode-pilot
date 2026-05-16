import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock child_process
const mockOn = jest.fn();
const mockKill = jest.fn();
const mockStdout = { on: jest.fn() };
const mockStderr = { on: jest.fn() };

jest.mock("node:child_process", () => ({
  spawn: jest.fn(() => ({
    on: mockOn,
    kill: mockKill,
    stdout: mockStdout,
    stderr: mockStderr,
    killed: false,
  })),
}));

import { createTunnelRouter, startTunnel, stopTunnel, getTunnelStatus } from "../tunnel.js";
import { spawn } from "node:child_process";

describe("tunnel module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure tunnel is stopped between tests
    stopTunnel();
  });

  describe("startTunnel / stopTunnel", () => {
    it("startTunnel spawns cloudflared", () => {
      startTunnel(3000);
      expect(spawn).toHaveBeenCalledWith("cloudflared", [
        "tunnel", "--url", "http://localhost:3000",
      ]);
    });

    it("startTunnel is idempotent", () => {
      startTunnel(3000);
      startTunnel(3000);
      expect(spawn).toHaveBeenCalledTimes(1);
    });

    it("stopTunnel kills the process", () => {
      startTunnel(3000);
      stopTunnel();
      expect(mockKill).toHaveBeenCalledWith("SIGTERM");
    });

    it("stopTunnel is safe when no tunnel running", () => {
      expect(() => stopTunnel()).not.toThrow();
    });
  });

  describe("getTunnelStatus", () => {
    it("returns inactive when no tunnel", () => {
      const status = getTunnelStatus();
      expect(status.active).toBe(false);
      expect(status.url).toBeNull();
    });
  });

  describe("createTunnelRouter", () => {
    it("GET /status returns tunnel status", async () => {
      const router = createTunnelRouter(3000);
      const res = await router.request("/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("active");
    });

    it("POST /start starts the tunnel", async () => {
      const router = createTunnelRouter(3000);
      const res = await router.request("/start", { method: "POST" });
      expect(res.status).toBe(200);
      expect(spawn).toHaveBeenCalled();
    });

    it("POST /stop stops the tunnel", async () => {
      startTunnel(3000);
      const router = createTunnelRouter(3000);
      const res = await router.request("/stop", { method: "POST" });
      expect(res.status).toBe(200);
    });
  });
});

describe("tunnel edge cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopTunnel();
  });

  it("handles rapid start/stop cycle", () => {
    startTunnel(3000);
    stopTunnel();
    startTunnel(3000);
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("throws ENOENT when cloudflared not found", () => {
    // Simulate spawn throwing ENOENT
    (spawn as jest.Mock).mockImplementationOnce(() => {
      const err = new Error("spawn cloudflared ENOENT");
      (err as NodeJS.ErrnoException).code = "ENOENT";
      throw err;
    });

    // startTunnel does not catch spawn errors
    expect(() => startTunnel(3000)).toThrow(/ENOENT/);
  });

  it("handles tunnel process exit with non-zero code", () => {
    startTunnel(3000);
    // Capture the exit handler
    const exitHandler = (mockOn.mock.calls as [string, unknown][]).find(
      ([event]) => event === "exit",
    );
    if (exitHandler) {
      const [, cb] = exitHandler;
      (cb as (code: number) => void)(1);
    }

    const status = getTunnelStatus();
    expect(status.active).toBe(false);
    expect(status.error).toContain("code 1");
  });

  it("handles non-URL output on stdout", () => {
    startTunnel(3000);
    const dataHandler = (mockStdout.on.mock.calls as [string, unknown][]).find(
      ([event]) => event === "data",
    );
    if (dataHandler) {
      const [, cb] = dataHandler;
      (cb as (data: Buffer) => void)(Buffer.from("some random log line\n"));
    }

    const status = getTunnelStatus();
    // URL should remain null since output didn't contain a tunnel URL
    expect(status.url).toBeNull();
  });

  it("double-start is idempotent", () => {
    startTunnel(3000);
    startTunnel(3000);
    startTunnel(3000);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("tunnel error event sets error state", () => {
    startTunnel(3000);
    const errorHandler = (mockOn.mock.calls as [string, unknown][]).find(
      ([event]) => event === "error",
    );
    if (errorHandler) {
      const [, cb] = errorHandler;
      (cb as (err: Error) => void)(new Error("connection refused"));
    }

    const status = getTunnelStatus();
    expect(status.active).toBe(false);
    expect(status.error).toBe("connection refused");
  });
});
