export const getExpoPushTokenAsync = jest.fn();
export const setNotificationHandler = jest.fn();
export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "granted" }),
);
export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: "granted" }),
);
export const setNotificationChannelAsync = jest.fn();
export const setNotificationCategoryAsync = jest.fn();
export const getLastNotificationResponseAsync = jest.fn(() =>
  Promise.resolve(null),
);
export const AndroidImportance = { DEFAULT: 3, MAX: 5 };
export const DEFAULT_ACTION_IDENTIFIER =
  "expo.modules.notifications.actions.DEFAULT";
