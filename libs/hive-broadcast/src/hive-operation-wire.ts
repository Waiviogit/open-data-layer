import type { CommentOptionsOp } from './hive-operations';

/**
 * Maps `comment_options` domain op to Hive Keychain / RPC payload object.
 */
export function wireCommentOptionsPayload(op: CommentOptionsOp): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    author: op.author,
    permlink: op.permlink,
    max_accepted_payout: op.max_accepted_payout,
    allow_votes: op.allow_votes,
    allow_curation_rewards: op.allow_curation_rewards,
    extensions: [...op.extensions],
  };
  if (op.percent_hbd !== undefined) {
    payload['percent_hbd'] = op.percent_hbd;
  }
  return payload;
}
