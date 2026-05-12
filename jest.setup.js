/**
 * Jest setup file — runs once before all test suites.
 */

// Global fetch mock
global.fetch = jest.fn();

// Suppress console during tests unless explicitly testing logger
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});
