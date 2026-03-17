export default {
  displayName: "frontend-integration",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],
  testMatch: ["<rootDir>/client/src/**/*.integration.test.js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  collectCoverage: false,
};
