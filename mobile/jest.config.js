/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'node',
      testMatch: [
        '<rootDir>/src/use-cases/**/*.test.ts',
        '<rootDir>/src/db/**/*.test.ts',
      ],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          { tsconfig: { jsx: 'react', esModuleInterop: true, types: ['jest', 'node'] } },
        ],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/screens/**/*.test.tsx'],
    },
  ],
};
