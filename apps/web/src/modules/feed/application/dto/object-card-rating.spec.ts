import { mergeRatingDimensions } from './object-card-rating';
import type { AggregateRatingAspectRow } from './object-fields';

describe('mergeRatingDimensions', () => {
  it('returns supposed dimensions with null update_id when no aspects exist', () => {
    expect(mergeRatingDimensions(['Quality', 'Value'], [])).toEqual([
      {
        dimension: 'Quality',
        update_id: null,
        averageRating01To5: null,
        userRating01To5: null,
        totalVoters: 0,
      },
      {
        dimension: 'Value',
        update_id: null,
        averageRating01To5: null,
        userRating01To5: null,
        totalVoters: 0,
      },
    ]);
  });

  it('fills matching aspects and omits on-chain dimensions not in supposed_updates', () => {
    const aspects: AggregateRatingAspectRow[] = [
      {
        update_id: 'u1',
        dimension: 'Quality',
        averageRating: 8000,
        userRating: 6000,
        totalVoters: 3,
      },
      {
        update_id: 'u2',
        dimension: 'Legacy',
        averageRating: 4000,
        userRating: null,
        totalVoters: 1,
      },
    ];
    const merged = mergeRatingDimensions(['Quality', 'Value'], aspects);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      dimension: 'Quality',
      update_id: 'u1',
      averageRating01To5: 4,
      userRating01To5: 3,
      totalVoters: 3,
    });
    expect(merged[1]).toMatchObject({
      dimension: 'Value',
      update_id: null,
      averageRating01To5: null,
    });
  });
});
