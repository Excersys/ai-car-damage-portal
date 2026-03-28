/** Jest config for Lambda unit tests (Node, not jsdom). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lambda/api'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['lambda/api/thirdPartyConfig.js'],
  coverageThreshold: {
    'lambda/api/thirdPartyConfig.js': {
      branches: 70,
      functions: 100,
      lines: 90,
      statements: 90
    }
  }
};
