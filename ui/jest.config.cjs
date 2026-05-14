/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@pilot-shared/types$": "<rootDir>/../shared/src/types.ts",
    "^@opencode-ai/plugin$": "<rootDir>/__mocks__/@opencode-ai/plugin.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/style.cjs",
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.tsx",
    "^remark-gfm$": "<rootDir>/__mocks__/remark-gfm.cjs",
    "^rehype-highlight$": "<rootDir>/__mocks__/rehype-highlight.cjs",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
    "src/services/**/*.{ts,tsx}",
    "src/store/**/*.{ts,tsx}",
    "src/plugin/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/__mocks__/**",
  ],
  reporters: ["jest-spec-reporter"],
  coverageProvider: "v8",
  coverageDirectory: "<rootDir>/../coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
