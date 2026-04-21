const path = require('path');
const nxPreset = require('@nx/jest/preset').default;

/** ESM-only package; stub avoids Jest/ts-jest choking on `multiformats/cid`. */
const multiformatsCidStub = path.join(__dirname, 'tools/jest/multiformats-cid-stub.ts');

module.exports = {
  ...nxPreset,
  moduleNameMapper: {
    '^multiformats/cid$': multiformatsCidStub,
  },
};
