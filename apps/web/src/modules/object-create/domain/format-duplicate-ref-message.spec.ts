import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { formatDuplicateRefMessage } from './format-duplicate-ref-message';

const t = (key: string) =>
  ({
    object_create_duplicate_user_ref:
      'Account {account} is already listed under {field}.',
    object_create_duplicate_object_ref:
      'Object {object} is already listed under {field}.',
    object_create_duplicate_ref_value: 'Already added.',
  })[key] ?? key;

describe('formatDuplicateRefMessage', () => {
  it('formats user_ref duplicate with account and field', () => {
    expect(
      formatDuplicateRefMessage(t, UPDATE_TYPES.ADMINS, 'Admins', 'alice'),
    ).toBe('Account alice is already listed under Admins.');
  });

  it('formats object_ref duplicate with object id and field', () => {
    expect(
      formatDuplicateRefMessage(
        t,
        UPDATE_TYPES.IS_RELATED_TO,
        'Related',
        'obj-42',
      ),
    ).toBe('Object obj-42 is already listed under Related.');
  });
});
