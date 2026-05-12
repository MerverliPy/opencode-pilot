export const createURL = jest.fn((path: string) => `pilot://${path}`);
export const getInitialURL = jest.fn(() => Promise.resolve(null));
export const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
