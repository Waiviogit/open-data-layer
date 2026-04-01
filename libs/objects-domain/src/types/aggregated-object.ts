import type {
  ObjectsCore,
  ObjectUpdate,
  ValidityVote,
  RankVote,
  ObjectAuthority,
} from '@opden-data-layer/core';

/**
 * All DB rows for a single object, grouped in memory after the 6-query pipeline.
 * @see docs/spec/data-model/flow.md §Step 3
 */
export interface AggregatedObject {
  core: ObjectsCore;
  updates: ObjectUpdate[];
  validity_votes: ValidityVote[];
  rank_votes: RankVote[];
  authorities: ObjectAuthority[];
}

/**
 * Shared voter reputation map built from accounts_current (query 6).
 * Key = voter name, value = object_reputation.
 */
export type VoterReputationMap = Map<string, number>;
