/**
 * Jest setup file — runs once before all test suites.
 */

require("@testing-library/jest-dom");

// setImmediate is not available in jsdom — polyfill with setTimeout
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Global fetch mock
global.fetch = jest.fn();

// scrollIntoView is not available in jsdom
global.HTMLElement.prototype.scrollIntoView = jest.fn();

// localStorage mock for jsdom (jsdom provides a basic implementation but
// we ensure it's fully functional for auth tests)
if (typeof globalThis.localStorage === "undefined") {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] ?? null,
  };
}

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
