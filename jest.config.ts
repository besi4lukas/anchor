import type { Config } from 'jest'

const shared = {
  preset: 'ts-jest' as const,
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

const config: Config = {
  projects: [
    {
      ...shared,
      displayName: 'lib',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/lib/**/*.test.ts'],
    },
    {
      ...shared,
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
  ],
}

export default config
