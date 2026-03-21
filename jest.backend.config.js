export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/config/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/models/*.test.js",
    "<rootDir>/routes/*.test.js",
    "<rootDir>/client/src/hooks/*.integration.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "config/**",
    "helpers/**",
    "middlewares/**",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
