/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/nodes', '<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/?(*.)+(spec|test).ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'nodes/**/*.ts',
    '!nodes/**/*.d.ts',
    '!nodes/**/index.ts',
    '!dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
};

module.exports = config;
