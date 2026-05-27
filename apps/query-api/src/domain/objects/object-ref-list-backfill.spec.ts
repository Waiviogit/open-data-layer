import {
  filterRelatedBackfillCategories,
  sortSimilarBackfillCategories,
} from './object-ref-list-backfill';

describe('object-ref-list-backfill', () => {
  const counts = new Map([
    ['Broad', 10_000],
    ['Narrow', 100],
    ['Tiny', 50],
  ]);

  it('related keeps categories at or above average count', () => {
    expect(filterRelatedBackfillCategories(['Broad', 'Narrow', 'Tiny'], counts)).toEqual([
      'Broad',
    ]);
  });

  it('related keeps all categories when each equals the average', () => {
    const even = new Map([
      ['A', 100],
      ['B', 100],
      ['C', 100],
    ]);
    expect(filterRelatedBackfillCategories(['A', 'B', 'C'], even)).toEqual(['A', 'B', 'C']);
  });

  it('similar sorts categories by count ascending', () => {
    expect(sortSimilarBackfillCategories(['Broad', 'Tiny', 'Narrow'], counts)).toEqual([
      'Tiny',
      'Narrow',
      'Broad',
    ]);
  });

  it('related and similar pick different category orderings for skewed counts', () => {
    const related = filterRelatedBackfillCategories(['Broad', 'Narrow', 'Tiny'], counts);
    const similar = sortSimilarBackfillCategories(['Broad', 'Narrow', 'Tiny'], counts);

    expect(related).not.toEqual(similar.slice(0, related.length));
    expect(similar[0]).toBe('Tiny');
    expect(related[0]).toBe('Broad');
  });
});
