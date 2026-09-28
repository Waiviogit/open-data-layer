import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  buildEditorQuickCreateEvents,
  buildEditorQuickCreateOps,
  prepareEditorQuickCreateFields,
} from './build-editor-quick-create-ops';

const BASE = {
  objectType: 'product',
  creator: 'alice',
  odlCustomJsonId: 'odl-testnet',
  language: 'en-US',
} as const;

describe('prepareEditorQuickCreateFields', () => {
  it('sets name and builds object id slug', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      'product',
      'en-US',
      'My Product',
      'abc',
    );
    expect(objectId).toBe('abc-my-product');
    const name = fields.find((f) => f.updateType === UPDATE_TYPES.NAME);
    expect(name?.value).toBe('My Product');
  });
});

describe('buildEditorQuickCreateEvents', () => {
  it('includes object_create, name, and supposed tag categories for product', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      BASE.objectType,
      BASE.language,
      'Gadget',
      'xyz',
    );
    const events = buildEditorQuickCreateEvents({
      ...BASE,
      objectId,
      fields,
    });

    expect(events[0]?.action).toBe('object_create');
    const updateTypes = events
      .filter((e) => e.action === 'update_create')
      .map((e) => (e.payload as { update_type?: string }).update_type);
    expect(updateTypes).toContain(UPDATE_TYPES.NAME);
    expect(updateTypes).toContain(UPDATE_TYPES.TAG_CATEGORY);
    expect(updateTypes).toContain(UPDATE_TYPES.AGGREGATE_RATING);
    expect(updateTypes).not.toContain(UPDATE_TYPES.DESCRIPTION);
    expect(updateTypes).not.toContain(UPDATE_TYPES.IMAGE);
  });

  it('omits a default active status field', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      BASE.objectType,
      BASE.language,
      'Gadget',
      'xyz',
    );
    const events = buildEditorQuickCreateEvents({
      ...BASE,
      objectId,
      fields: [
        ...fields,
        {
          entryKey: 'status',
          updateType: UPDATE_TYPES.STATUS,
          value: { title: 'active' },
          locale: BASE.language,
        },
      ],
    });
    const updateTypes = events
      .filter((e) => e.action === 'update_create')
      .map((e) => (e.payload as { update_type?: string }).update_type);
    expect(updateTypes).not.toContain(UPDATE_TYPES.STATUS);
  });

  it('appends object_follow when followObject is true', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      BASE.objectType,
      BASE.language,
      'Gadget',
      'xyz',
    );
    const events = buildEditorQuickCreateEvents({
      ...BASE,
      objectId,
      fields,
      followObject: true,
    });

    const follow = events.find((e) => e.action === 'object_follow');
    expect(follow).toBeDefined();
    expect(follow?.payload).toEqual({
      object_id: objectId,
      method: 'follow',
    });
  });

  it('throws when name is empty', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      BASE.objectType,
      BASE.language,
      '   ',
      'xyz',
    );
    expect(() =>
      buildEditorQuickCreateEvents({
        ...BASE,
        objectId,
        fields,
      }),
    ).toThrow('name_required');
  });
});

describe('buildEditorQuickCreateOps', () => {
  it('returns at least one custom_json op', () => {
    const { objectId, fields } = prepareEditorQuickCreateFields(
      BASE.objectType,
      BASE.language,
      'Gadget',
      'xyz',
    );
    const ops = buildEditorQuickCreateOps({
      ...BASE,
      objectId,
      fields,
    });
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0]?.type).toBe('custom_json');
  });
});
