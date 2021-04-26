const E2E_MODE = process.env.npm_lifecycle_event === 'e2e';

const config = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/api/**/*.js',
  ],
};

// E2E requires a special preset
config.preset = (E2E_MODE) ? 'jest-puppeteer' : '';

// We output coverage on unit-tests, not E2E
config.collectCoverage = !E2E_MODE;

module.exports = config;
