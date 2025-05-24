// jest.config.js
module.exports = {
    testEnvironment: 'node',
    testTimeout: 10000,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    verbose: true,

    // By default, run unit tests (no setup file needed)
    testMatch: ['<rootDir>/tests/unit/**/*.test.js'],

    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'services/**/*.js',
        'config/**/*.js',
        'app.js',
        '!node_modules/**',
        '!coverage/**',
        '!bin/**'
    ],

    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    }
};