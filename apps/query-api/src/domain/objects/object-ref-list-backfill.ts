/**
 * Category backfill rules for related/similar ref lists.
 * @see tmp/waivio-api-legacy/utilities/operations/shop/getCloseProducts.js (getRelated / getSimilar)
 */

/** Related: departments with global count >= average of the source object's departments. */
export function filterRelatedBackfillCategories(
  categoryNames: readonly string[],
  counts: ReadonlyMap<string, number>,
): string[] {
  if (categoryNames.length === 0) {
    return [];
  }

  const totalCount = categoryNames.reduce((sum, name) => sum + (counts.get(name) ?? 0), 0);
  const averageCount = totalCount / categoryNames.length;

  return categoryNames.filter((name) => (counts.get(name) ?? 0) >= averageCount);
}

/** Similar: source departments sorted by count ascending (smallest first). */
export function sortSimilarBackfillCategories(
  categoryNames: readonly string[],
  counts: ReadonlyMap<string, number>,
): string[] {
  return [...categoryNames].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
}
