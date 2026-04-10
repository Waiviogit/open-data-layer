import type {
  CommentOp,
  CommentOptionsOp,
  CustomJsonOp,
  ReblogOp,
  VoteOp,
} from './hive-operations';

export function buildVoteOp(
  voter: string,
  author: string,
  permlink: string,
  weight: number,
): VoteOp {
  return { type: 'vote', voter, author, permlink, weight };
}

export function buildCommentOp(input: {
  parent_author: string;
  parent_permlink: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
}): CommentOp {
  return {
    type: 'comment',
    parent_author: input.parent_author,
    parent_permlink: input.parent_permlink,
    author: input.author,
    permlink: input.permlink,
    title: input.title,
    body: input.body,
    json_metadata: input.json_metadata,
  };
}

export function buildCommentOptionsOp(input: {
  author: string;
  permlink: string;
  max_accepted_payout: string;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  extensions?: readonly unknown[];
}): CommentOptionsOp {
  return {
    type: 'comment_options',
    author: input.author,
    permlink: input.permlink,
    max_accepted_payout: input.max_accepted_payout,
    allow_votes: input.allow_votes,
    allow_curation_rewards: input.allow_curation_rewards,
    extensions: input.extensions ?? [],
  };
}

export function buildCustomJsonOp(input: {
  required_auths: readonly string[];
  required_posting_auths: readonly string[];
  id: string;
  json: string;
}): CustomJsonOp {
  return {
    type: 'custom_json',
    required_auths: input.required_auths,
    required_posting_auths: input.required_posting_auths,
    id: input.id,
    json: input.json,
  };
}

export function buildReblogOp(account: string, author: string, permlink: string): ReblogOp {
  return { type: 'reblog', account, author, permlink };
}
