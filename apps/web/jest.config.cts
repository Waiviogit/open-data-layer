const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  displayName: 'web',
  testEnvironment: 'node',
  coverageDirectory: '../../coverage/apps/web',
  moduleFileExtensions: [...nxPreset.moduleFileExtensions, 'tsx', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mts|mjs|cts|cjs|html)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: 'commonjs',
          moduleResolution: 'node',
          strict: true,
        },
      },
    ],
  },
};
