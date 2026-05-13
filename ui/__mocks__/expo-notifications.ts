/**
 * Mock for expo-notifications.
 * All exports are jest.fn() so tests can use mockResolvedValue / toHaveBeenCalledWith.
 * Web Push will be implemented in M3.
 */
export const DEFAULT_ACTION_IDENTIFIER = "default";
export const AndroidImportance = { DEFAULT: "default" };

export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ status: "granted" });
export const requestPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ status: "granted" });
export const getExpoPushTokenAsync = jest
  .fn()
  .mockResolvedValue({ data: "mock-push-token" });
export const addNotificationResponseReceivedListener = jest
  .fn()
  .mockReturnValue({ remove: jest.fn() });
export const getLastNotificationResponseAsync = jest
  .fn()
  .mockResolvedValue(null);
export const setNotificationCategoryAsync = jest
  .fn()
  .mockResolvedValue(undefined);
