import { SignedBlock } from '@hiveio/dhive/lib/chain/block';
import {
  ActiveVotesType,
  CommentStateType,
  HiveAccountType,
  HiveContentType,
  HiveFollowRelation,
  HiveMutedAccount,
} from '../type';
import { CommentOptionsOperation } from '@hiveio/dhive/lib/chain/operation';
import { BeneficiaryRoute } from '@hiveio/dhive/lib/chain/comment';

export interface HiveClientInterface {
  getBlock(blockNumber: number): Promise<SignedBlock | undefined>;

  getContent(
    author: string,
    permlink: string,
  ): Promise<HiveContentType | undefined>;
  getActiveVotes(author: string, permlink: string): Promise<ActiveVotesType[]>;
  getVote({
    author,
    voter,
    permlink,
  }: GetVoteInterface): Promise<ActiveVotesType | undefined>;
  getState(author: string, permlink: string): Promise<CommentStateType>;
  getOptionsWithBeneficiaries(
    author: string,
    permlink: string,
    beneficiaries: BeneficiaryRoute[],
  ): CommentOptionsOperation[1];

  getAccounts(names: string[]): Promise<HiveAccountType[]>;

  getFollowers(
    account: string,
    startFollower: string | null,
    type: 'blog',
    limit: number,
  ): Promise<HiveFollowRelation[]>;

  getFollowing(
    account: string,
    startFollowing: string | null,
    type: 'blog',
    limit: number,
  ): Promise<HiveFollowRelation[]>;

  getMutedList(observer: string): Promise<HiveMutedAccount[]>;
}

export interface GetVoteInterface {
  voter: string;
  author: string;
  permlink: string;
}
