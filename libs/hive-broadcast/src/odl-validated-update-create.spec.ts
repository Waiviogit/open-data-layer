import { buildValidatedUpdateCreateOp } from './odl-validated-update-create';

describe('buildValidatedUpdateCreateOp', () => {
  const base = {
    id: 'odl-testnet',
    objectId: 'recipe-demo-1',
    creator: 'alice',
  };

  it('builds image update_create with value_json and no object_create', () => {
    const op = buildValidatedUpdateCreateOp({
      ...base,
      updateType: 'image',
      value: { cid: 'QmTestCid' },
    });

    expect(op.type).toBe('custom_json');
    const parsed = JSON.parse(op.json) as {
      events: Array<{ action: string; payload: Record<string, unknown> }>;
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('update_create');
    expect(parsed.events[0]?.payload['value_json']).toEqual({ cid: 'QmTestCid' });
    expect(parsed.events[0]?.payload['update_type']).toBe('image');
    expect(parsed.events[0]?.payload['locale']).toBe('en-US');
  });

  it('builds name update_create with value_text', () => {
    const op = buildValidatedUpdateCreateOp({
      ...base,
      updateType: 'name',
      value: 'Borscht',
      locale: 'uk-UA',
    });

    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['value_text']).toBe('Borscht');
    expect(payload['locale']).toBe('uk-UA');
  });

  it('normalizes creator and sets posting auths', () => {
    const op = buildValidatedUpdateCreateOp({
      ...base,
      creator: '@Alice',
      updateType: 'title',
      value: 'South Minneapolis',
    });

    expect(op.required_posting_auths).toEqual(['alice']);
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['creator']).toBeUndefined();
  });

  it('throws for unknown update_type', () => {
    expect(() =>
      buildValidatedUpdateCreateOp({
        ...base,
        updateType: 'not_a_real_update',
        value: 'x',
      }),
    ).toThrow('Unknown update_type: not_a_real_update');
  });

  it('throws for invalid value', () => {
    expect(() =>
      buildValidatedUpdateCreateOp({
        ...base,
        updateType: 'image',
        value: { cid: 'Qm', url: 'https://example.com/a.png' },
      }),
    ).toThrow('Invalid value for update_type "image"');
  });
});
