import { objectFields, type AggregateRatingAspectRow } from './object-fields';
import type { FeedStoryView } from './feed-story.dto';

function viewWithAgg(
  aggregateRating: unknown,
): NonNullable<FeedStoryView['objects']>[number] {
  return {
    object_id: 'x',
    object_type: 'business',
    semantic_type: null,
    weight: null,
    fields: { aggregateRating },
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

describe('objectFields aggregateRating', () => {
  it('parses aggregateRating aspect rows', () => {
    const rows: AggregateRatingAspectRow[] = [
      {
        update_id: 'u-overall',
        dimension: 'Overall',
        averageRating: 9500,
        userRating: 1000,
        totalVoters: 12,
      },
      {
        update_id: null,
        dimension: 'Value',
        averageRating: null,
        userRating: null,
        totalVoters: 0,
      },
    ];
    expect(objectFields.aggregateRatingAspects(viewWithAgg(rows))).toEqual(rows);
    expect(objectFields.ratingStars01To5(viewWithAgg(rows))).toBeCloseTo(9500 / 2000, 5);
  });

  it('returns null compact stars when no non-null aspect averages exist', () => {
    expect(
      objectFields.ratingStars01To5(
        viewWithAgg([
          {
            update_id: 'u-x',
            dimension: 'X',
            averageRating: null,
            userRating: 500,
            totalVoters: 3,
          },
        ]),
      ),
    ).toBeNull();
  });

  it('averages multiple non-null aspect scores for compact feed stars (0–5)', () => {
    expect(
      objectFields.ratingStars01To5(
        viewWithAgg([
          { update_id: 'a', dimension: 'A', averageRating: 10000, userRating: null, totalVoters: 2 },
          { update_id: 'b', dimension: 'B', averageRating: 0, userRating: null, totalVoters: 2 },
        ]),
      ),
    ).toBe(2.5);
  });

  it('ignores malformed entries and rejects legacy object shape', () => {
    expect(objectFields.ratingStars01To5(viewWithAgg({ dimensions: [] }))).toBeNull();
    expect(objectFields.aggregateRatingAspects(viewWithAgg(null))).toEqual([]);
  });
});
