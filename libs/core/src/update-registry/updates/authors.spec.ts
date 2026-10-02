import { OBJECT_TYPE_REGISTRY } from '../../object-type-registry/object-type-registry';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';
import { UPDATE_REGISTRY } from '../update-registry';
import { UPDATE_TYPES } from '../update-types';
import { UPDATE_AUTHORS } from './authors';

describe('UPDATE_AUTHORS', () => {
  it('accepts a Hive account as an authors update value', () => {
    expect(UPDATE_AUTHORS.schema.safeParse('alice').success).toBe(true);
    expect(UPDATE_AUTHORS.value_kind).toBe('user_ref');
    expect(UPDATE_AUTHORS.cardinality).toBe('multi');
    expect(UPDATE_REGISTRY[UPDATE_TYPES.AUTHORS]).toBe(UPDATE_AUTHORS);
  });

  it('rejects an invalid Hive account as an authors value', () => {
    expect(UPDATE_AUTHORS.schema.safeParse('A!').success).toBe(false);
    expect(UPDATE_AUTHORS.schema.safeParse('a'.repeat(17)).success).toBe(false);
  });

  it('is supported on governance and not on book', () => {
    expect(OBJECT_TYPE_REGISTRY[OBJECT_TYPES.GOVERNANCE].supported_updates).toContain(
      UPDATE_TYPES.AUTHORS,
    );
    expect(OBJECT_TYPE_REGISTRY[OBJECT_TYPES.BOOK].supported_updates).not.toContain(
      UPDATE_TYPES.AUTHORS,
    );
  });
});
