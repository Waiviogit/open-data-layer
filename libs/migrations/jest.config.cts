module.exports = {
  displayName: 'migrations',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  maxWorkers: 1,
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@opden-data-layer/test-postgres$':
      '<rootDir>/../test-postgres/src/index.ts',
    '^@opden-data-layer/migrations$': '<rootDir>/src/index.ts',
    '^@opden-data-layer/odl-db-types$': '<rootDir>/../odl-db-types/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/migrations',
};
