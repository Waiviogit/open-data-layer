import {
  buildOdlObjectAuthorityOp,
  buildOdlObjectFollowOp,
  buildOdlRankVoteOp,
  buildOdlUpdateCreateOp,
  buildOdlUpdateCreateWithLikeOp,
  buildOdlUpdateCreateWithRankVoteOp,
  buildOdlUpdateVoteOp,
  buildOdlUserFollowBellOp,
} from './odl-operations';

describe('buildOdlUpdateCreateOp', () => {
  const base = {
    id: 'odl-testnet',
    objectId: 'obj-1',
    updateType: 'name',
    creator: 'alice',
    required_posting_auths: ['alice'] as const,
  };

  it('builds custom_json op with correct id and posting auths', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      valueKind: 'text',
      value: 'My Business',
    });
    expect(op.type).toBe('custom_json');
    expect(op.id).toBe('odl-testnet');
    expect(op.required_posting_auths).toEqual(['alice']);
    expect(op.required_auths).toEqual([]);
  });

  it('serializes update_create envelope with value_text for text kind', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      valueKind: 'text',
      value: 'My Business',
      locale: 'en-US',
    });
    const parsed = JSON.parse(op.json) as {
      events: {
        action: string;
        v: number;
        event_id?: string;
        payload: Record<string, unknown>;
      }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('update_create');
    expect(parsed.events[0]?.v).toBe(1);
    expect(parsed.events[0]?.event_id).toBeUndefined();
    const payload = parsed.events[0]?.payload;
    expect(payload?.['object_id']).toBe('obj-1');
    expect(payload?.['update_type']).toBe('name');
    expect(payload?.['creator']).toBe('alice');
    expect(payload?.['transaction_id']).toBeUndefined();
    expect(payload?.['value_text']).toBe('My Business');
    expect(payload?.['locale']).toBe('en-US');
    expect(payload?.['value_json']).toBeUndefined();
    expect(payload?.['value_geo']).toBeUndefined();
  });

  it('maps json kind to value_json', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      updateType: 'address',
      valueKind: 'json',
      value: { street: '1 Main', locality: 'Town', postal_code: '1', country: 'US' },
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['value_json']).toEqual({
      street: '1 Main',
      locality: 'Town',
      postal_code: '1',
      country: 'US',
    });
  });

  it('maps geo kind to value_geo', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      updateType: 'geo',
      valueKind: 'geo',
      value: { latitude: 10, longitude: 20 },
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['value_geo']).toEqual({ latitude: 10, longitude: 20 });
  });

  it('maps object_ref kind to value_text', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      updateType: 'parent',
      valueKind: 'object_ref',
      value: 'parent-obj-id',
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['value_text']).toBe('parent-obj-id');
  });

  it('omits locale when not provided', () => {
    const op = buildOdlUpdateCreateOp({
      ...base,
      valueKind: 'text',
      value: 'x',
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['locale']).toBeUndefined();
  });
});

describe('buildOdlUpdateCreateWithLikeOp', () => {
  const base = {
    id: 'odl-testnet',
    objectId: 'obj-1',
    updateType: 'name',
    creator: 'alice',
    valueKind: 'text' as const,
    value: 'My Business',
    required_posting_auths: ['alice'] as const,
  };

  it('emits update_create with event_id then update_vote with create_event_id', () => {
    const op = buildOdlUpdateCreateWithLikeOp(base);
    const parsed = JSON.parse(op.json) as {
      events: {
        action: string;
        event_id?: string;
        payload: Record<string, unknown>;
      }[];
    };
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[0]?.action).toBe('update_create');
    expect(parsed.events[1]?.action).toBe('update_vote');
    const createEventId = parsed.events[0]?.event_id;
    expect(createEventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(parsed.events[1]?.payload['create_event_id']).toBe(createEventId);
    expect(parsed.events[1]?.payload['vote']).toBe('for');
    expect(parsed.events[1]?.payload['voter']).toBe('alice');
    expect(parsed.events[1]?.payload['object_id']).toBe('obj-1');
    expect(parsed.events[1]?.payload['update_id']).toBeUndefined();
    expect(parsed.events[1]?.payload['transaction_id']).toBeUndefined();
    expect(parsed.events[0]?.payload['transaction_id']).toBeUndefined();
  });
});

describe('buildOdlUpdateVoteOp', () => {
  it('emits update_vote with update_id and vote for', () => {
    const op = buildOdlUpdateVoteOp({
      id: 'odl-testnet',
      updateId: 'trx-0-0-1',
      objectId: 'obj-1',
      voter: 'alice',
      vote: 'for',
      required_posting_auths: ['alice'],
    });
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('update_vote');
    expect(parsed.events[0]?.payload['update_id']).toBe('trx-0-0-1');
    expect(parsed.events[0]?.payload['object_id']).toBe('obj-1');
    expect(parsed.events[0]?.payload['voter']).toBe('alice');
    expect(parsed.events[0]?.payload['vote']).toBe('for');
  });

  it('emits vote against', () => {
    const op = buildOdlUpdateVoteOp({
      id: 'odl-mainnet',
      updateId: 'u1',
      objectId: 'o1',
      voter: 'bob',
      vote: 'against',
    });
    expect(JSON.parse(op.json).events[0].payload['vote']).toBe('against');
  });
});

describe('buildOdlUpdateCreateWithRankVoteOp', () => {
  it('emits update_create with event_id then rank_vote with create_event_id', () => {
    const op = buildOdlUpdateCreateWithRankVoteOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      valueText: 'Quality',
      creator: 'alice',
      rank: 8000,
      required_posting_auths: ['alice'],
    });
    const parsed = JSON.parse(op.json) as {
      events: {
        action: string;
        event_id?: string;
        payload: Record<string, unknown>;
      }[];
    };
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[0]?.action).toBe('update_create');
    expect(parsed.events[1]?.action).toBe('rank_vote');
    const createEventId = parsed.events[0]?.event_id;
    expect(createEventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(parsed.events[0]?.payload['update_type']).toBe('aggregateRating');
    expect(parsed.events[0]?.payload['value_text']).toBe('Quality');
    expect(parsed.events[1]?.payload['create_event_id']).toBe(createEventId);
    expect(parsed.events[1]?.payload['update_id']).toBeUndefined();
    expect(parsed.events[1]?.payload['rank']).toBe(8000);
    expect(parsed.events[1]?.payload['voter']).toBe('alice');
  });
});

describe('buildOdlRankVoteOp', () => {
  it('emits rank_vote with rank and default rank_context', () => {
    const op = buildOdlRankVoteOp({
      id: 'odl-testnet',
      updateId: 'trx-0-0-3',
      objectId: 'obj-1',
      voter: 'alice',
      rank: 7000,
      required_posting_auths: ['alice'],
    });
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('rank_vote');
    expect(parsed.events[0]?.payload['update_id']).toBe('trx-0-0-3');
    expect(parsed.events[0]?.payload['object_id']).toBe('obj-1');
    expect(parsed.events[0]?.payload['voter']).toBe('alice');
    expect(parsed.events[0]?.payload['rank']).toBe(7000);
    expect(parsed.events[0]?.payload['rank_context']).toBe('default');
  });
});

describe('buildOdlObjectAuthorityOp', () => {
  it('emits object_authority with administrative add', () => {
    const op = buildOdlObjectAuthorityOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      authorityType: 'administrative',
      method: 'add',
      required_posting_auths: ['alice'],
    });
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('object_authority');
    expect(parsed.events[0]?.payload['object_id']).toBe('obj-1');
    expect(parsed.events[0]?.payload['authority_type']).toBe('administrative');
    expect(parsed.events[0]?.payload['method']).toBe('add');
    expect(op.required_posting_auths).toEqual(['alice']);
  });

  it('emits remove for ownership', () => {
    const op = buildOdlObjectAuthorityOp({
      id: 'odl-mainnet',
      objectId: 'o2',
      authorityType: 'ownership',
      method: 'remove',
    });
    expect(JSON.parse(op.json).events[0].payload['method']).toBe('remove');
    expect(JSON.parse(op.json).events[0].payload['authority_type']).toBe('ownership');
  });
});

describe('buildOdlUserFollowBellOp', () => {
  it('emits user_follow bell event', () => {
    const op = buildOdlUserFollowBellOp({
      id: 'odl-testnet',
      following: 'alice',
      bell: true,
      required_posting_auths: ['bob'],
    });
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.action).toBe('user_follow');
    expect(parsed.events[0]?.payload).toEqual({
      following: 'alice',
      method: 'bell',
      bell: true,
    });
  });
});

describe('buildOdlObjectFollowOp', () => {
  it('emits object_follow with method follow and no bell field', () => {
    const op = buildOdlObjectFollowOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      method: 'follow',
      required_posting_auths: ['alice'],
    });
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('object_follow');
    expect(parsed.events[0]?.payload['object_id']).toBe('obj-1');
    expect(parsed.events[0]?.payload['method']).toBe('follow');
    expect(parsed.events[0]?.payload).not.toHaveProperty('bell');
  });

  it('emits object_follow with method unfollow', () => {
    const op = buildOdlObjectFollowOp({
      id: 'odl-mainnet',
      objectId: 'obj-2',
      method: 'unfollow',
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(JSON.parse(op.json).events[0].action).toBe('object_follow');
    expect(payload['method']).toBe('unfollow');
    expect(payload).not.toHaveProperty('bell');
  });

  it('emits object_follow bell with bell true', () => {
    const op = buildOdlObjectFollowOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      method: 'bell',
      bell: true,
      required_posting_auths: ['alice'],
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['method']).toBe('bell');
    expect(payload['bell']).toBe(true);
  });
});
