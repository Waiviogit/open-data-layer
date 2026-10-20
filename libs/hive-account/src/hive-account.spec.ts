import {
  deriveAccountKeys,
  isHiveAccountName,
  suggestAccountName,
  suggestMasterPassword,
} from './index';

const ALICE_SECRET_KEYS = {
  owner: {
    private: '5JuPkHCQy1V5e9WXDVRvLzsKiNp1BnnqxTQs1Yw2j2az976nByr',
    public: 'STM8T2z6cxyBDeWzGgm4DC1RRwPHJURqT4rh2fuNVD6XMkDenK2iZ',
  },
  active: {
    private: '5K8ASCuHZaLd1zNmmKLtoZQ2SiqsbzCesLNwJa5sW4okFxFtN5e',
    public: 'STM8jpiQGmXVUNBFRg2CD1r1SqCxaSQWJQWPW66azMbSPCoB2R3kB',
  },
  posting: {
    private: '5J35yKDpDDbBS9tRAL3pFu2hAcMsvpcDBFaGdiErL2qjfqHj2mh',
    public: 'STM6VarNyd955vm3anLL3Pkzh8zsuPq9q3NdxNkdVTNenH6jgYpkt',
  },
  memo: {
    private: '5JSQSohVvRmtkFr9beyS1Xchgs76svDqTz4VsJV32JZXv4mJFzR',
    public: 'STM7oJfSLiXV1ar4nZs4giepCctKaDw3QsDzrXBGxEDC2gUWKJJmK',
  },
} as const;

const UNLOWERCASED_ALICE_OWNER_WIF =
  '5KFef7iB7Sz91L4r7vnhu5zM6vQ2nBXBkujwq9nHEG9YXVtfpAf';

function fillEntropy(fill: (index: number) => number) {
  return jest
    .spyOn(crypto, 'getRandomValues')
    .mockImplementation(<T extends ArrayBufferView>(array: T): T => {
      const view = new Uint8Array(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      for (let i = 0; i < view.length; i += 1) {
        view[i] = fill(i);
      }
      return array;
    });
}

describe('deriveAccountKeys', () => {
  it('derives the four role key pairs for a lowercase name', () => {
    const keys = deriveAccountKeys('alice', 'secret');

    expect(Object.keys(keys).sort()).toEqual(
      ['active', 'memo', 'owner', 'posting'].sort(),
    );
    expect(keys).toEqual(ALICE_SECRET_KEYS);
  });

  it('lowercases the account name before derivation', () => {
    const keys = deriveAccountKeys('Alice', 'secret');

    expect(keys).toEqual(ALICE_SECRET_KEYS);
    expect(keys.owner.private).not.toBe(UNLOWERCASED_ALICE_OWNER_WIF);
  });

  it('does not collapse whitespace inside the password', () => {
    const keys = deriveAccountKeys('alice', 'sec ret');

    expect(keys.owner).toEqual({
      private: '5HqgbEvGW98shUSkCuguoAnCCoDyE9rP9J24hZhtBT7AUXLphLe',
      public: 'STM6GAREPxTP2yDjwGHbKGBVB28FeNSNDGjwBEr4hWWu9NnmAbAjk',
    });
    expect(keys.owner).not.toEqual(ALICE_SECRET_KEYS.owner);
  });

  it('repeats the same key pairs for the same inputs', () => {
    expect(deriveAccountKeys('alice', 'secret')).toEqual(ALICE_SECRET_KEYS);
    expect(deriveAccountKeys('alice', 'secret')).toEqual(ALICE_SECRET_KEYS);
  });
});

describe('suggestMasterPassword', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the master password from a latin1 seed of 40 bytes', () => {
    fillEntropy((index) => index);

    expect(suggestMasterPassword()).toBe(
      'P5JYRDrFGuYtdTMeGr2BgsY8LTUmZDvQrm47h85eaCqh92M8TNKK',
    );
  });

  it('uses a different master password when the 40-byte entropy differs', () => {
    fillEntropy(() => 0xff);

    expect(suggestMasterPassword()).toBe(
      'P5K4s2k84rPvaSErP1dWS9Mg1NbvrCCX34uS6euqMC8myS9Q8Xys',
    );
    expect(suggestMasterPassword()).not.toBe(
      'P5JYRDrFGuYtdTMeGr2BgsY8LTUmZDvQrm47h85eaCqh92M8TNKK',
    );
  });
});

describe('isHiveAccountName', () => {
  it.each([
    ['abc', true],
    ['abc.def', true],
    ['abcdefghijklmnop', true],
    ['ab1', true],
    ['ab-c', true],
    ['ab', false],
    ['AB', false],
    ['a.bc', false],
    ['abcdefghijklmnopq', false],
    ['abc-', false],
    ['', false],
    ['-abc', false],
    ['abc.', false],
    ['abc..def', false],
    ['abc def', false],
    ['abc.de', false],
  ] as const)('evaluates %j as %s', (name, expected) => {
    expect(isHiveAccountName(name)).toBe(expected);
  });
});

describe('suggestAccountName', () => {
  it('suggests an 8-letter lowercase name', () => {
    const name = suggestAccountName();

    expect(name).toMatch(/^[a-z]{8}$/);
    expect(isHiveAccountName(name)).toBe(true);
  });
});
