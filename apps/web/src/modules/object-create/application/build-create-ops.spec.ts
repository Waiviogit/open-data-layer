import { buildCreateOps } from './build-create-ops';

describe('buildCreateOps', () => {
  it('includes object_create and update_create events in one envelope', () => {
    const op = buildCreateOps({
      objectId: 'abc12345',
      objectType: 'recipe',
      creator: 'alice',
      odlCustomJsonId: 'odl-testnet',
      language: 'en-US',
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

    const envelope = JSON.parse(op.json) as {
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
});
