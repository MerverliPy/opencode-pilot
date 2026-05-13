/**
 * Tests for the Web Push client service.
 */
import {
  fetchPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "../push";

describe("push service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("fetchPushStatus", () => {
    it("returns push status from server", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ enabled: true, publicKey: "pk" }),
      });

      const status = await fetchPushStatus();
      expect(status).toEqual({ enabled: true, publicKey: "pk" });
      expect(global.fetch).toHaveBeenCalledWith("/push/status");
    });

    it("throws on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(fetchPushStatus()).rejects.toThrow("HTTP 500");
    });
  });

  describe("subscribeToPush", () => {
    it("returns false when serviceWorker is unavailable", async () => {
      // @ts-expect-error deleting navigator.serviceWorker for test
      delete navigator.serviceWorker;
      const result = await subscribeToPush("pk");
      expect(result).toBe(false);
    });

    it("subscribes and syncs with server", async () => {
      const mockSubscription = {
        endpoint: "https://push.example/ep",
        toJSON: () => ({
          endpoint: "https://push.example/ep",
          keys: { p256dh: "p256", auth: "auth" },
        }),
      };

      const mockPushManager = {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue(mockSubscription),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
        configurable: true,
      });
      Object.defineProperty(window, "PushManager", {
        value: {},
        configurable: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await subscribeToPush("dGVzdA==");
      expect(result).toBe(true);
      expect(mockPushManager.subscribe).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "/push/subscribe",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("unsubscribeFromPush", () => {
    it("unsubscribes and notifies server", async () => {
      const mockSubscription = {
        endpoint: "https://push.example/ep",
        unsubscribe: jest.fn().mockResolvedValue(true),
      };

      const mockPushManager = {
        getSubscription: jest.fn().mockResolvedValue(mockSubscription),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
        configurable: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await unsubscribeFromPush();
      expect(result).toBe(true);
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("isPushSubscribed", () => {
    it("returns true when subscribed", async () => {
      const mockPushManager = {
        getSubscription: jest.fn().mockResolvedValue({ endpoint: "ep" }),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
        configurable: true,
      });

      const result = await isPushSubscribed();
      expect(result).toBe(true);
    });

    it("returns false when not subscribed", async () => {
      const mockPushManager = {
        getSubscription: jest.fn().mockResolvedValue(null),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({ pushManager: mockPushManager }) },
        configurable: true,
      });

      const result = await isPushSubscribed();
      expect(result).toBe(false);
    });
  });
});
