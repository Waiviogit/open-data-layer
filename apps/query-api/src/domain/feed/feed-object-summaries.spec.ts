import { sortLinkedObjectSummaries, type LinkedObjectDetailRow } from './feed-object-summaries';

function row(overrides: Partial<LinkedObjectDetailRow> = {}): LinkedObjectDetailRow {
  return {
    objectId: 'a',
    objectType: 'recipe',
    name: 'N',
    avatarUrl: null,
    weight: 0,
    description: null,
    rating: null,
    categoryItems: [],
    ...overrides,
  };
}

describe('sortLinkedObjectSummaries', () => {
  it('sets hasAdministrativeAuthority when object id is in the administrative set', () => {
    const admin = new Set(['b']);
    const out = sortLinkedObjectSummaries([row({ objectId: 'a' }), row({ objectId: 'b' })], admin);
    expect(out.find((o) => o.objectId === 'a')?.hasAdministrativeAuthority).toBe(false);
    expect(out.find((o) => o.objectId === 'b')?.hasAdministrativeAuthority).toBe(true);
  });
});
