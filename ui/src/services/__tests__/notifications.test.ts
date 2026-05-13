import {
  registerForPushNotifications,
  registerPermissionCategory,
} from "../notifications";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { savePushToken } from "../auth";

jest.mock("../auth", () => ({
  savePushToken: jest.fn(),
}));

describe("notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerForPushNotifications", () => {
    it("returns null on simulator", async () => {
      (Device as any).isDevice = false;
      const token = await registerForPushNotifications();
      expect(token).toBeNull();
    });

    it("returns null when permission denied", async () => {
      (Device as any).isDevice = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      const token = await registerForPushNotifications();
      expect(token).toBeNull();
    });

    it("returns token and saves it on success", async () => {
      (Device as any).isDevice = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: "expo-token-123",
      });

      const token = await registerForPushNotifications();
      expect(token).toBe("expo-token-123");
      expect(savePushToken).toHaveBeenCalledWith("expo-token-123");
    });

    it("requests permission when not already granted", async () => {
      (Device as any).isDevice = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "undetermined",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: "token",
      });

      await registerForPushNotifications();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("handles token fetch error gracefully", async () => {
      (Device as any).isDevice = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error("network error"),
      );

      const token = await registerForPushNotifications();
      expect(token).toBeNull();
    });
  });

  describe("registerPermissionCategory", () => {
    it("registers category with two actions", async () => {
      await registerPermissionCategory();
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        "PILOT_PERMISSION",
        expect.arrayContaining([
          expect.objectContaining({ identifier: "ALLOW_ONCE" }),
          expect.objectContaining({ identifier: "DENY" }),
        ]),
      );
    });
  });
});
