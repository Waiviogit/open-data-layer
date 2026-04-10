/**
 * Hive `vote` operation weight in **basis points** (10000 = 100%).
 * Extend {@link VoteWeightContext} when adding sliders / custom % / downvotes.
 */

/** Full upvote weight (100%). */
export const HIVE_VOTE_WEIGHT_FULL = 10000;

/** Remove vote (clear weight). */
export const HIVE_VOTE_WEIGHT_CLEAR = 0;

export type VoteWeightContext = {
  readonly currentlyVoted: boolean;
};

export function defaultResolveVoteWeight(ctx: VoteWeightContext): number {
  return ctx.currentlyVoted ? HIVE_VOTE_WEIGHT_CLEAR : HIVE_VOTE_WEIGHT_FULL;
}
