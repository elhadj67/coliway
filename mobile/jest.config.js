module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        esModuleInterop: true,
        allowJs: true,
        strict: false,
        paths: { '@/*': ['./*'] },
        baseUrl: '.',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase|expo-location|expo-router))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};
