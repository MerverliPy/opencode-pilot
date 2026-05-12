/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^react-native$": "<rootDir>/__mocks__/react-native.ts",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.ts",
    "^expo-constants$": "<rootDir>/__mocks__/expo-constants.ts",
    "^expo-device$": "<rootDir>/__mocks__/expo-device.ts",
    "^expo-notifications$": "<rootDir>/__mocks__/expo-notifications.ts",
    "^expo-haptics$": "<rootDir>/__mocks__/expo-haptics.ts",
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.ts",
    "^expo-linking$": "<rootDir>/__mocks__/expo-linking.ts",
    "^expo-clipboard$": "<rootDir>/__mocks__/expo-clipboard.ts",
    "^expo-font$": "<rootDir>/__mocks__/expo-font.ts",
    "^expo-router$": "<rootDir>/__mocks__/expo-router.ts",
    "^react-native-sse$": "<rootDir>/__mocks__/react-native-sse.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: ["/.opencode/", "/node_modules/"],
  testPathIgnorePatterns: ["/.opencode/", "/node_modules/"],
  collectCoverageFrom: [
    "services/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "plugin/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/__mocks__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
