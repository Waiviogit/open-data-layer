import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { FieldEntry } from './object-create.types';
import {
  categorizePendingUpdateType,
  summarizePendingOps,
} from './summarize-pending-ops';

function entry(updateType: string, value: unknown): FieldEntry {
  return {
    entryKey: `${updateType}-1`,
    updateType,
    value,
  };
}

describe('categorizePendingUpdateType', () => {
  it('maps relations and identity', () => {
    expect(categorizePendingUpdateType(UPDATE_TYPES.NAME)).toBe('identity');
    expect(categorizePendingUpdateType(UPDATE_TYPES.PARENT)).toBe('relations');
    expect(categorizePendingUpdateType(UPDATE_TYPES.IMAGE)).toBe('metadata');
  });
});

describe('summarizePendingOps', () => {
  it('counts filled ops by category', () => {
    const summary = summarizePendingOps([
      entry(UPDATE_TYPES.NAME, 'Cafe'),
      entry(UPDATE_TYPES.PARENT, 'hive:parent'),
      entry(UPDATE_TYPES.IMAGE, { url: 'https://x.test/a.jpg' }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.byCategory.identity).toBe(1);
    expect(summary.byCategory.relations).toBe(1);
    expect(summary.byCategory.metadata).toBe(1);
  });

  it('skips empty values', () => {
    expect(summarizePendingOps([entry(UPDATE_TYPES.NAME, '   ')]).total).toBe(0);
  });
});
