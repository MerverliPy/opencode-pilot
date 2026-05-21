/**
 * Tests for the tunnel client service.
 */
import { fetchTunnelStatus, startTunnel, stopTunnel } from "../tunnel";

describe("tunnel service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchTunnelStatus", () => {
    it("returns tunnel status from server", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            active: true,
            url: "https://abc.trycloudflare.com",
            error: null,
          }),
      });

      const status = await fetchTunnelStatus();
      expect(status).toEqual({
        active: true,
        url: "https://abc.trycloudflare.com",
        error: null,
      });
      expect(global.fetch).toHaveBeenCalledWith("/tunnel/status", {
        credentials: "include",
      });
    });

    it("throws on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
      await expect(fetchTunnelStatus()).rejects.toThrow("HTTP 503");
    });
  });

  describe("startTunnel", () => {
    it("sends POST to /tunnel/start", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await startTunnel();
      expect(global.fetch).toHaveBeenCalledWith("/tunnel/start", {
        method: "POST",
        headers: { "X-Requested-With": "PilotPWA" },
        credentials: "include",
      });
    });

    it("throws on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(startTunnel()).rejects.toThrow("HTTP 500");
    });
  });

  describe("stopTunnel", () => {
    it("sends POST to /tunnel/stop", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await stopTunnel();
      expect(global.fetch).toHaveBeenCalledWith("/tunnel/stop", {
        method: "POST",
        headers: { "X-Requested-With": "PilotPWA" },
        credentials: "include",
      });
    });

    it("throws on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(stopTunnel()).rejects.toThrow("HTTP 500");
    });
  });
});
