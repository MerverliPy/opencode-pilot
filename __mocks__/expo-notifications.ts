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
export const AndroidImportance = { MAX: 5 };
