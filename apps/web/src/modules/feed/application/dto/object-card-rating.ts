import type { AggregateRatingAspectRow } from './object-fields';

const RANK_UNITS_PER_STAR = 2000;

export type CardRatingDimension = {
  dimension: string;
  update_id: string | null;
  averageRating01To5: number | null;
  userRating01To5: number | null;
  totalVoters: number;
};

function rankToStars01To5(rank: number | null): number | null {
  if (rank == null || !Number.isFinite(rank)) {
    return null;
  }
  return Math.min(5, Math.max(0, rank / RANK_UNITS_PER_STAR));
}

function aspectToCardRow(
  dimension: string,
  aspect: AggregateRatingAspectRow | undefined,
): CardRatingDimension {
  if (!aspect) {
    return {
      dimension,
      update_id: null,
      averageRating01To5: null,
      userRating01To5: null,
      totalVoters: 0,
    };
  }
  return {
    dimension,
    update_id: aspect.update_id,
    averageRating01To5: rankToStars01To5(aspect.averageRating),
    userRating01To5: rankToStars01To5(aspect.userRating),
    totalVoters: aspect.totalVoters,
  };
}

/**
 * Card rows for registry `supposed_updates` rating dimensions only.
 * On-chain aspects not listed in the registry are omitted from the card.
 * Supposed dimensions without matching aspects appear as empty (null stars).
 */
export function mergeRatingDimensions(
  supposedNames: string[],
  aspects: AggregateRatingAspectRow[],
): CardRatingDimension[] {
  const byDimension = new Map(aspects.map((a) => [a.dimension, a]));
  return supposedNames.map((dim) => aspectToCardRow(dim, byDimension.get(dim)));
}
