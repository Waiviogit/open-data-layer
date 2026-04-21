/**
 * Jest cannot execute `multiformats` (ESM-only) under the default ts-jest/CJS
 * pipeline. Map `multiformats/cid` here in jest.preset.js; production still uses
 * real `multiformats/cid`.
 */
export const CID = {
  parse(value: string): unknown {
    if (typeof value !== 'string') {
      throw new Error('Invalid CID');
    }
    const s = value.trim();
    if (s.length === 0) {
      throw new Error('Invalid CID');
    }
    if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(s)) {
      return {};
    }
    if (/^b[a-z2-7]{50,}$/.test(s)) {
      return {};
    }
    throw new Error('Invalid CID');
  },
};
