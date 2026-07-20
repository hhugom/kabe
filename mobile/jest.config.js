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
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*))',
      ],
    },
  ],
};
