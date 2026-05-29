import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { RefFieldRow } from './duplicate-ref-field-values';
import {
  excludedRefValuesForEntry,
  findDuplicateRefUpdateTypes,
  isDuplicateRefValue,
  isRefValueExcluded,
  refValuesEqual,
} from './duplicate-ref-field-values';

const rows: RefFieldRow[] = [
  { entryKey: 'admins:a', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
  { entryKey: 'admins:b', updateType: UPDATE_TYPES.ADMINS, value: '' },
  { entryKey: 'parent:1', updateType: UPDATE_TYPES.PARENT, value: 'obj-1' },
];

describe('refValuesEqual', () => {
  it('matches Hive account names case-insensitively', () => {
    expect(refValuesEqual('user_ref', 'Alice', 'alice')).toBe(true);
  });

  it('matches object ids exactly', () => {
    expect(refValuesEqual('object_ref', 'obj-1', 'obj-1')).toBe(true);
    expect(refValuesEqual('object_ref', 'obj-1', 'OBJ-1')).toBe(false);
  });
});

describe('isDuplicateRefValue', () => {
  it('detects duplicate user_ref for same update type', () => {
    expect(
      isDuplicateRefValue(rows, UPDATE_TYPES.ADMINS, 'admins:b', 'alice'),
    ).toBe(true);
    expect(
      isDuplicateRefValue(rows, UPDATE_TYPES.ADMINS, 'admins:b', 'Alice'),
    ).toBe(true);
    expect(
      isDuplicateRefValue(rows, UPDATE_TYPES.ADMINS, 'admins:b', 'bob'),
    ).toBe(false);
  });

  it('allows same user on different update types', () => {
    const mixed: RefFieldRow[] = [
      { entryKey: 'admins:1', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
      { entryKey: 'trusted:1', updateType: UPDATE_TYPES.TRUSTED, value: 'alice' },
    ];
    expect(
      isDuplicateRefValue(mixed, UPDATE_TYPES.TRUSTED, 'trusted:1', 'alice'),
    ).toBe(false);
  });

  it('detects duplicate object_ref', () => {
    const objectRows: RefFieldRow[] = [
      { entryKey: 'p:1', updateType: UPDATE_TYPES.PARENT, value: 'obj-1' },
      { entryKey: 'p:2', updateType: UPDATE_TYPES.PARENT, value: '' },
    ];
    expect(
      isDuplicateRefValue(objectRows, UPDATE_TYPES.PARENT, 'p:2', 'obj-1'),
    ).toBe(true);
  });

  it('ignores empty candidate', () => {
    expect(
      isDuplicateRefValue(rows, UPDATE_TYPES.ADMINS, 'admins:b', ''),
    ).toBe(false);
  });
});

describe('excludedRefValuesForEntry', () => {
  it('lists sibling row values excluding current entry', () => {
    expect(excludedRefValuesForEntry(rows, UPDATE_TYPES.ADMINS, 'admins:b')).toEqual([
      'alice',
    ]);
    expect(excludedRefValuesForEntry(rows, UPDATE_TYPES.ADMINS, 'admins:a')).toEqual(
      [],
    );
  });
});

describe('isRefValueExcluded', () => {
  it('uses user_ref case rules for exclusion list', () => {
    expect(isRefValueExcluded('user_ref', 'ALICE', ['alice'])).toBe(true);
    expect(isRefValueExcluded('object_ref', 'obj-1', ['obj-1'])).toBe(true);
    expect(isRefValueExcluded('object_ref', 'OBJ-1', ['obj-1'])).toBe(false);
  });
});

describe('findDuplicateRefUpdateTypes', () => {
  it('returns update types with duplicate refs', () => {
    const dup: RefFieldRow[] = [
      { entryKey: 'a1', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
      { entryKey: 'a2', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
      { entryKey: 'p1', updateType: UPDATE_TYPES.PARENT, value: 'x' },
      { entryKey: 'p2', updateType: UPDATE_TYPES.PARENT, value: 'x' },
    ];
    expect(findDuplicateRefUpdateTypes(dup).sort()).toEqual(
      [UPDATE_TYPES.ADMINS, UPDATE_TYPES.PARENT].sort(),
    );
  });
});
