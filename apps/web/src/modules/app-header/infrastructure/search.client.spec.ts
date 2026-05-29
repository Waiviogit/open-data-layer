import { pickSearchObjectById, pickSearchUserByName } from './search.client';
import type { SearchObjectResult } from '../domain/search-response.schema';
import type { SearchUserResult } from '../domain/search-response.schema';

function obj(
  partial: Partial<SearchObjectResult> & Pick<SearchObjectResult, 'object_id'>,
): SearchObjectResult {
  return {
    object_type: 'recipe',
    name: 'Vegan bowl',
    image_url: null,
    parent_name: null,
    ...partial,
  };
}

function user(partial: Partial<SearchUserResult> & Pick<SearchUserResult, 'name'>): SearchUserResult {
  return {
    profile_image: null,
    reputation: 1,
    followers_count: 0,
    is_following: false,
    ...partial,
  };
}

describe('pickSearchUserByName', () => {
  it('returns exact account match case-insensitively', () => {
    const hit = user({ name: 'alice', profile_image: 'https://example.com/a.jpg' });
    expect(pickSearchUserByName([user({ name: 'bob' }), hit], 'Alice')).toEqual(hit);
  });
});

describe('pickSearchObjectById', () => {
  it('returns exact id match', () => {
    const hit = obj({ object_id: 'abc-vegan', name: 'Vegan' });
    expect(
      pickSearchObjectById(
        [obj({ object_id: 'other' }), hit],
        'abc-vegan',
      ),
    ).toEqual(hit);
  });

  it('filters by appliesTo', () => {
    const hit = obj({ object_id: 'x-1', object_type: 'recipe' });
    expect(
      pickSearchObjectById([hit], 'x-1', ['business']),
    ).toBeNull();
  });
});
