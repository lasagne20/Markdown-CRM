module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__', '<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
      useESM: false // Disable ESM for speed in tests
    }]
  },
  moduleNameMapper: { // Fixed from moduleNameMapping
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js',
    '^../src/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!__tests__/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 1000, // Fast timeout for unit tests
  // Performance optimizations
  watchman: true, // Enable for faster file watching
  watchPlugins: [],
  maxWorkers: 2, // Use fixed number instead of percentage for consistency
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: false, // Don't reset mocks between tests - faster
  restoreMocks: false, // Don't restore mocks - faster
  // Disable verbose output by default for speed
  verbose: false,
  // Additional speed optimizations
  forceExit: true,
  detectOpenHandles: false,
  // Speed up module resolution
  modulePathIgnorePatterns: ['node_modules', '.jest-cache'],
  // Speed up test discovery
  testPathIgnorePatterns: ['/node_modules/', '/coverage/', '/.jest-cache/', '__tests__/utils/mocks.ts'],
  // Don't run coverage unless explicitly requested
  collectCoverage: false
};