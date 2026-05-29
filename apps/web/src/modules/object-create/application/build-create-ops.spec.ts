import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { HIVE_CUSTOM_OP_DATA_MAX_LENGTH } from '@opden-data-layer/hive-broadcast';

import {
  buildCreateOdlJson,
  buildCreateOps,
  OBJECT_CREATE_MAX_OPS_PER_TRX,
} from './build-create-ops';

const BASE = {
  objectId: 'abc12345',
  objectType: 'recipe',
  creator: 'alice',
  odlCustomJsonId: 'odl-testnet',
  language: 'en-US',
} as const;

type TestField = {
  entryKey: string;
  updateType: string;
  value: unknown;
};

/** Satisfies recipe required updates (name, description, image, ingredients). */
function recipeRequiredFields(): TestField[] {
  return [
    { entryKey: 'name', updateType: 'name', value: 'My Recipe' },
    {
      entryKey: 'description',
      updateType: 'description',
      value: 'A tasty dish',
    },
    {
      entryKey: 'image',
      updateType: 'image',
      value: { url: 'https://example.com/recipe.jpg' },
    },
    {
      entryKey: 'ingredients',
      updateType: 'ingredients',
      value: ['flour', 'eggs'],
    },
  ];
}

function jsonByteLength(json: string): number {
  return new TextEncoder().encode(json).length;
}

function largeText(chars: number): string {
  return 'x'.repeat(chars);
}

describe('buildCreateOps', () => {
  it('includes object_create and update_create events in one envelope', () => {
    const ops = buildCreateOps({
      ...BASE,
      fields: [
        { entryKey: 'name', updateType: 'name', value: 'My Recipe' },
        {
          entryKey: 'description',
          updateType: 'description',
          value: 'A tasty dish',
        },
        {
          entryKey: 'image',
          updateType: 'image',
          value: { url: 'https://example.com/recipe.jpg' },
        },
        {
          entryKey: 'ingredients',
          updateType: 'ingredients',
          value: ['flour', 'eggs'],
        },
      ],
    });

    expect(ops).toHaveLength(1);
    const envelope = JSON.parse(ops[0]!.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(envelope.events[0]?.action).toBe('object_create');
    expect(envelope.events[0]?.payload).toMatchObject({
      object_id: 'abc12345',
      object_type: 'recipe',
      creator: 'alice',
    });

    const updates = envelope.events.filter((e) => e.action === 'update_create');
    expect(updates.length).toBeGreaterThanOrEqual(4);
    expect(updates.map((e) => e.payload.update_type)).toEqual(
      expect.arrayContaining(['name', 'description', 'image', 'ingredients']),
    );
    const nameEvent = updates.find((e) => e.payload.update_type === 'name');
    expect(nameEvent?.payload).toMatchObject({
      object_id: 'abc12345',
      update_type: 'name',
      value_text: 'My Recipe',
    });
  });

  it('omits duplicate user_ref rows for the same update type', () => {
    const ops = buildCreateOps({
      objectId: 'gov1',
      objectType: 'governance',
      creator: 'owner',
      odlCustomJsonId: 'odl-testnet',
      language: 'en-US',
      fields: [
        { entryKey: 'name', updateType: UPDATE_TYPES.NAME, value: 'Gov' },
        { entryKey: 'admins:1', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
        { entryKey: 'admins:2', updateType: UPDATE_TYPES.ADMINS, value: 'alice' },
      ],
    });

    const envelope = JSON.parse(ops[0]!.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    const adminEvents = envelope.events.filter(
      (e) =>
        e.action === 'update_create' &&
        e.payload.update_type === UPDATE_TYPES.ADMINS,
    );
    expect(adminEvents).toHaveLength(1);
    expect(adminEvents[0]?.payload).toMatchObject({ value_text: 'alice' });
  });

  it('omits duplicate object_ref rows for the same update type', () => {
    const ops = buildCreateOps({
      objectId: 'prod1',
      objectType: 'product',
      creator: 'alice',
      odlCustomJsonId: 'odl-testnet',
      language: 'en-US',
      fields: [
        ...recipeRequiredFields(),
        {
          entryKey: 'rel:1',
          updateType: UPDATE_TYPES.IS_RELATED_TO,
          value: 'related-obj',
        },
        {
          entryKey: 'rel:2',
          updateType: UPDATE_TYPES.IS_RELATED_TO,
          value: 'related-obj',
        },
      ],
    });

    const envelope = JSON.parse(ops[0]!.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    const relEvents = envelope.events.filter(
      (e) =>
        e.action === 'update_create' &&
        e.payload.update_type === UPDATE_TYPES.IS_RELATED_TO,
    );
    expect(relEvents).toHaveLength(1);
  });

  it('maps user_ref update to value_text in update_create payload', () => {
    const ops = buildCreateOps({
      objectId: 'gov1',
      objectType: 'governance',
      creator: 'owner',
      odlCustomJsonId: 'odl-testnet',
      language: 'en-US',
      fields: [
        { entryKey: 'name', updateType: UPDATE_TYPES.NAME, value: 'Gov' },
        {
          entryKey: 'admins:alice',
          updateType: UPDATE_TYPES.ADMINS,
          value: 'alice',
        },
        {
          entryKey: 'admins:bob',
          updateType: UPDATE_TYPES.ADMINS,
          value: 'bob',
        },
      ],
    });

    const envelope = JSON.parse(ops[0]!.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    const adminEvents = envelope.events.filter(
      (e) =>
        e.action === 'update_create' &&
        e.payload.update_type === UPDATE_TYPES.ADMINS,
    );
    expect(adminEvents).toHaveLength(2);
    expect(adminEvents[0]?.payload).toMatchObject({
      value_text: 'alice',
    });
    expect(adminEvents[0]?.payload).not.toHaveProperty('value_user_ref');
    expect(adminEvents[1]?.payload).toMatchObject({
      value_text: 'bob',
    });
  });

  it('fits in one op when JSON is within 8192 bytes', () => {
    const ops = buildCreateOps({
      ...BASE,
      fields: recipeRequiredFields(),
    });
    expect(ops).toHaveLength(1);
    expect(jsonByteLength(ops[0]!.json)).toBeLessThanOrEqual(
      HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
    );
  });

  it('splits into two ops when events exceed 8192 bytes', () => {
    const ops = buildCreateOps({
      ...BASE,
      fields: [
        ...recipeRequiredFields().filter((f) => f.updateType !== 'description'),
        {
          entryKey: 'description',
          updateType: 'description',
          value: largeText(6000),
        },
        {
          entryKey: 'extra-desc',
          updateType: 'description',
          value: largeText(3000),
          locale: 'de-DE',
        },
      ],
    });

    expect(ops).toHaveLength(2);
    const first = JSON.parse(ops[0]!.json) as {
      events: { action: string }[];
    };
    expect(first.events[0]?.action).toBe('object_create');

    for (const op of ops) {
      expect(jsonByteLength(op.json)).toBeLessThanOrEqual(
        HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
      );
    }

    const allEvents = ops.flatMap(
      (op) =>
        (JSON.parse(op.json) as { events: unknown[] }).events,
    );
    expect(allEvents.length).toBeGreaterThan(2);
  });

  it('throws when a single event exceeds 8192 bytes', () => {
    expect(() =>
      buildCreateOps({
        ...BASE,
        fields: [
          ...recipeRequiredFields().filter((f) => f.updateType !== 'description'),
          {
            entryKey: 'description',
            updateType: 'description',
            value: largeText(HIVE_CUSTOM_OP_DATA_MAX_LENGTH),
          },
        ],
      }),
    ).toThrow(/Single ODL event exceeds Hive custom_json limit/);
  });

  it('throws when events require more than 5 ops', () => {
    const extraDescriptions = Array.from({ length: 14 }, (_, i) => ({
      entryKey: `description:${i}`,
      updateType: 'description',
      value: largeText(2800),
      locale: `loc-${i}`,
    }));

    expect(() =>
      buildCreateOps({
        ...BASE,
        fields: [...recipeRequiredFields(), ...extraDescriptions],
      }),
    ).toThrow(
      new RegExp(
        `maximum is ${OBJECT_CREATE_MAX_OPS_PER_TRX} per transaction`,
      ),
    );
  });
});

describe('buildCreateOdlJson', () => {
  it('returns all events in one string regardless of size', () => {
    const fields = [
      ...recipeRequiredFields().filter((f) => f.updateType !== 'description'),
      {
        entryKey: 'description',
        updateType: 'description',
        value: largeText(6000),
      },
      {
        entryKey: 'extra-desc',
        updateType: 'description',
        value: largeText(3000),
        locale: 'de-DE',
      },
    ];
    const json = buildCreateOdlJson({ ...BASE, fields });
    const parsed = JSON.parse(json) as { events: unknown[] };
    expect(parsed.events.length).toBeGreaterThan(2);
    expect(jsonByteLength(json)).toBeGreaterThan(HIVE_CUSTOM_OP_DATA_MAX_LENGTH);

    const ops = buildCreateOps({ ...BASE, fields });
    expect(ops.length).toBeGreaterThan(1);
  });
});
