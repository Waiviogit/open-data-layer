import type { ResolvedObjectView, ResolvedUpdate } from '@opden-data-layer/objects-domain';
import { assembleSnapshot } from './assemble-snapshot';

function ru(partial: Partial<ResolvedUpdate>): ResolvedUpdate {
  return {
    update_id: 'u1',
    update_type: partial.update_type ?? 'admins',
    creator: 'alice',
    created_at_unix: 1,
    event_seq: BigInt(1),
    value_text: null,
    value_json: null,
    validity_status: 'VALID',
    field_weight: null,
    rank_score: null,
    rank_context: null,
    ...partial,
  };
}

describe('assembleSnapshot', () => {
  it('collects text-cardinality fields and parses json fields', () => {
    const view: ResolvedObjectView = {
      object_id: 'g1',
      object_type: 'governance',
      creator: 'alice',
      weight: null,
      meta_group_id: null,
      fields: {
        admins: { update_type: 'admins', cardinality: 'multi', values: [ru({ value_text: 'a1' })] },
        trusted: { update_type: 'trusted', cardinality: 'multi', values: [] },
        moderators: { update_type: 'moderators', cardinality: 'multi', values: [ru({ value_text: 'm1' })] },
        authorities: { update_type: 'authorities', cardinality: 'multi', values: [] },
        restricted: { update_type: 'restricted', cardinality: 'multi', values: [] },
        banned: { update_type: 'banned', cardinality: 'multi', values: [] },
        whitelist: { update_type: 'whitelist', cardinality: 'multi', values: [ru({ value_text: 'w1' })] },
        object_control: {
          update_type: 'object_control',
          cardinality: 'single',
          values: [ru({ update_type: 'object_control', value_text: 'full' })],
        },
        inherits_from: {
          update_type: 'inherits_from',
          cardinality: 'multi',
          values: [
            ru({
              update_type: 'inherits_from',
              value_json: {
                object_id: 'parent1',
                scope: ['admins', 'muted', 'unknown_scope'],
              },
            }),
          ],
        },
        validity_cutoff: {
          update_type: 'validity_cutoff',
          cardinality: 'multi',
          values: [
            ru({
              update_type: 'validity_cutoff',
              value_json: { account: 'bob', timestamp: 99 },
            }),
          ],
        },
      },
    };

    const snap = assembleSnapshot(view);
    expect(snap.admins).toEqual(['a1']);
    expect(snap.moderators).toEqual(['m1']);
    expect(snap.whitelist).toEqual(['w1']);
    expect(snap.object_control).toBe('full');
    expect(snap.muted).toEqual([]);
    expect(snap.inherits_from).toEqual([{ object_id: 'parent1', scope: ['admins', 'muted'] }]);
    expect(snap.validity_cutoff).toEqual([{ account: 'bob', timestamp: 99 }]);
  });

  it('treats unknown object_control as null', () => {
    const view: ResolvedObjectView = {
      object_id: 'g1',
      object_type: 'governance',
      creator: 'alice',
      weight: null,
      meta_group_id: null,
      fields: {
        object_control: {
          update_type: 'object_control',
          cardinality: 'single',
          values: [ru({ update_type: 'object_control', value_text: 'nope' })],
        },
      },
    };
    expect(assembleSnapshot(view).object_control).toBeNull();
  });
});
