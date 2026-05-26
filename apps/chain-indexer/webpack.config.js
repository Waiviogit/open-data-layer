const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/chain-indexer'),
    clean: true,
    ...(!isProd && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: isProd,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: !isProd,
    }),
  ],
};
