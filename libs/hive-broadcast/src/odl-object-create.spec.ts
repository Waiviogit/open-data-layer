import { HIVE_CUSTOM_OP_DATA_MAX_LENGTH } from './constants';
import {
  buildObjectCreateEnvelope,
  chunkOdlEventsIntoOps,
  OBJECT_CREATE_MAX_OPS_PER_TRX,
  parseObjectIdFromCreateOdlJson,
  resolveOdlValueFieldKey,
  type AgentObjectCreateField,
  type BuildObjectCreateEnvelopeInput,
  type BuildObjectCreateEnvelopeResult,
  type OdlCreateEvent,
} from './odl-object-create';

const BASE = {
  objectId: 'recipe-abc123',
  objectType: 'recipe',
  creator: 'alice',
  id: 'odl-testnet',
} as const;

function jsonByteLength(json: string): number {
  return new TextEncoder().encode(json).length;
}

function largeText(chars: number): string {
  return 'x'.repeat(chars);
}

describe('buildObjectCreateEnvelope', () => {
  it('builds recipe object_create with name, description, ingredients, cookTime', () => {
    const fields: AgentObjectCreateField[] = [
      { updateType: 'name', value: 'Borscht' },
      { updateType: 'description', value: 'Classic beet soup' },
      { updateType: 'ingredients', value: ['beetroot', 'cabbage'] },
      { updateType: 'cookTime', value: 'PT45M' },
    ];

    const result = buildObjectCreateEnvelope({
      ...BASE,
      fields,
    });

    expect(result.warnings).toEqual([]);
    expect(result.events[0]).toEqual({
      action: 'object_create',
      v: 1,
      payload: {
        object_id: BASE.objectId,
        object_type: BASE.objectType,
        creator: BASE.creator,
      },
    });

    const nameEvent = result.events.find(
      (event) =>
        event.action === 'update_create' &&
        event.payload['update_type'] === 'name',
    );
    expect(nameEvent?.payload).toMatchObject({
      object_id: BASE.objectId,
      update_type: 'name',
      creator: BASE.creator,
      value_text: 'Borscht',
    });

    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]?.required_posting_auths).toEqual([BASE.creator]);
    expect(result.ops[0]?.id).toBe(BASE.id);
  });

  it('rejects unknown object_type', () => {
    expect(() =>
      buildObjectCreateEnvelope({
        ...BASE,
        objectType: 'not-a-type',
        fields: [],
      }),
    ).toThrow('Unknown object_type: not-a-type');
  });

  it('warns and skips unsupported update_type for object_type', () => {
    const result = buildObjectCreateEnvelope({
      ...BASE,
      fields: [{ updateType: 'totallyMadeUp', value: 'x' }],
    });

    expect(result.warnings).toEqual([
      'Skipped unsupported update "totallyMadeUp" for object_type "recipe"',
    ]);
    expect(result.events).toHaveLength(1);
  });

  it('rejects invalid field value for update_type', () => {
    expect(() =>
      buildObjectCreateEnvelope({
        ...BASE,
        fields: [{ updateType: 'cookTime', value: { bogus: true } }],
      }),
    ).toThrow('Invalid value for update_type "cookTime"');
  });

  it('sets requiresIpfsBatch when a single event exceeds the Hive limit', () => {
    const result = buildObjectCreateEnvelope({
      objectId: 'legal-abc',
      objectType: 'legal_document',
      creator: BASE.creator,
      id: BASE.id,
      fields: [{ updateType: 'legalText', value: largeText(20_000) }],
    });

    expect(result.requiresIpfsBatch).toBe(true);
    expect(result.ops).toEqual([]);
    expect(result.events.length).toBeGreaterThan(1);
  });
});

describe('chunkOdlEventsIntoOps', () => {
  it('splits oversized envelopes into multiple ops within byte limit', () => {
    const events: OdlCreateEvent[] = [
      {
        action: 'object_create',
        v: 1,
        payload: {
          object_id: BASE.objectId,
          object_type: BASE.objectType,
          creator: BASE.creator,
        },
      },
      {
        action: 'update_create',
        v: 1,
        payload: {
          object_id: BASE.objectId,
          update_type: 'description',
          creator: BASE.creator,
          value_text: largeText(7_000),
        },
      },
      {
        action: 'update_create',
        v: 1,
        payload: {
          object_id: BASE.objectId,
          update_type: 'name',
          creator: BASE.creator,
          value_text: largeText(7_000),
        },
      },
    ];

    const ops = chunkOdlEventsIntoOps({
      events,
      creator: BASE.creator,
      id: BASE.id,
    });

    expect(ops.length).toBeGreaterThan(1);
    for (const op of ops) {
      expect(jsonByteLength(op.json)).toBeLessThanOrEqual(
        HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
      );
    }
  });

  it('rejects more than OBJECT_CREATE_MAX_OPS_PER_TRX chunks', () => {
    const events: OdlCreateEvent[] = Array.from(
      { length: OBJECT_CREATE_MAX_OPS_PER_TRX + 1 },
      (_, index) => ({
        action: 'update_create' as const,
        v: 1 as const,
        payload: {
          object_id: BASE.objectId,
          update_type: 'description',
          creator: BASE.creator,
          value_text: largeText(7_500 + index),
        },
      }),
    );

    expect(() =>
      chunkOdlEventsIntoOps({
        events,
        creator: BASE.creator,
        id: BASE.id,
      }),
    ).toThrow(
      `Object create requires ${OBJECT_CREATE_MAX_OPS_PER_TRX + 1} custom_json operations; maximum is ${OBJECT_CREATE_MAX_OPS_PER_TRX} per transaction`,
    );
  });
});

describe('resolveOdlValueFieldKey', () => {
  it('maps object_ref and user_ref to value_text', () => {
    expect(resolveOdlValueFieldKey('object_ref')).toBe('value_text');
    expect(resolveOdlValueFieldKey('user_ref')).toBe('value_text');
    expect(resolveOdlValueFieldKey('text')).toBe('value_text');
  });
});

describe('parseObjectIdFromCreateOdlJson', () => {
  it('reads object_id from object_create envelope', () => {
    const json = JSON.stringify({
      events: [
        {
          action: 'object_create',
          v: 1,
          payload: { object_id: 'recipe-1', object_type: 'recipe' },
        },
      ],
    });

    expect(parseObjectIdFromCreateOdlJson(json)).toBe('recipe-1');
  });
});
