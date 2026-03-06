/**
 * One document per rank vote. Collection: rank_votes.
 *
 * Extracted from the v1 embedded updates[].rankVotes[] array.
 * Used for multi-cardinality updates only. rank is 1..10000.
 */

import type { CanonicalPosition } from './shared-types';

export interface RankVoteDocument {
  updateId: string;
  objectId: string;
  voter: string;
  rank: number;
  rankContext: string;
  position: CanonicalPosition;
}
