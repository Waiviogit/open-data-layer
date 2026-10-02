import { SignedBlock } from '@hiveio/dhive/lib/chain/block';
import {
  ActiveVotesType,
  CommentStateType,
  HiveAccountType,
  HiveContentType,
  HiveCurrentMedianHistoryPrice,
  HiveFollowRelation,
  HiveMutedAccount,
  HiveAccountHistoryPage,
  HiveAccountHistoryRow,
  HiveBlogEntry,
  HiveDynamicGlobalProperties,
  HiveRewardFund,
  HiveOperationFilter,
  HiveRcAccount,
  HiveRcDelegation,
  HiveSavingsWithdrawRequest,
  HiveVestingDelegation,
  HiveVestingDelegationExpiration,
  HiveFindVestingDelegationsResult,
  HiveFindVestingDelegationExpirationsResult,
} from '../type';
import { CommentOptionsOperation } from '@hiveio/dhive/lib/chain/operation';
import { BeneficiaryRoute } from '@hiveio/dhive/lib/chain/comment';

export interface HiveClientInterface {
  getBlock(blockNumber: number): Promise<SignedBlock | undefined>;

  getContent(
    author: string,
    permlink: string,
  ): Promise<HiveContentType | undefined>;

  /** `condenser_api.get_discussions_by_comments` — comments authored by `start_author` (normalized to lowercase), paginated by `start_permlink`. `limit` is clamped to [1, 20] (Hive node assertion). */
  getDiscussionsByComments(params: {
    start_author: string;
    start_permlink?: string;
    limit: number;
  }): Promise<HiveContentType[]>;

  /** `condenser_api.get_blog_entries` — blog index incl. reblogs. `start` = entry_id (0 = newest). */
  getBlogEntries(
    account: string,
    start: number,
    limit: number,
  ): Promise<HiveBlogEntry[]>;
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

  /** Like `getAccounts` but throws when the node is unavailable. */
  getAccountsStrict(names: string[]): Promise<HiveAccountType[]>;

  getVestingDelegations(
    delegator: string,
    startDelegatee: string,
    limit: number,
  ): Promise<HiveVestingDelegation[]>;

  getVestingDelegationsStrict(
    delegator: string,
    startDelegatee: string,
    limit: number,
  ): Promise<HiveVestingDelegation[]>;

  findVestingDelegationsToAccount(account: string): Promise<HiveVestingDelegation[]>;

  findVestingDelegationsToAccountStrict(account: string): Promise<HiveVestingDelegation[]>;

  findVestingDelegationExpirations(
    account: string,
  ): Promise<HiveVestingDelegationExpiration[]>;

  findVestingDelegationExpirationsStrict(
    account: string,
  ): Promise<HiveVestingDelegationExpiration[]>;

  findRcAccounts(accounts: string[]): Promise<HiveRcAccount[]>;

  findRcAccountsStrict(accounts: string[]): Promise<HiveRcAccount[]>;

  listRcDirectDelegations(
    from: string,
    to: string,
    limit: number,
  ): Promise<HiveRcDelegation[]>;

  listRcDirectDelegationsStrict(
    from: string,
    to: string,
    limit: number,
  ): Promise<HiveRcDelegation[]>;

  getSavingsWithdrawFrom(account: string): Promise<HiveSavingsWithdrawRequest[]>;

  getSavingsWithdrawFromStrict(account: string): Promise<HiveSavingsWithdrawRequest[]>;

  getDynamicGlobalPropertiesStrict(): Promise<HiveDynamicGlobalProperties>;

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

  /** Median historic base / quote (e.g. HBD per HIVE) from chain witnesses. */
  getCurrentMedianHistoryPrice(): Promise<
    HiveCurrentMedianHistoryPrice | undefined
  >;

  getMutedList(observer: string): Promise<HiveMutedAccount[]>;

  /** `condenser_api.get_account_history` — paginated on-chain account operations. `from=-1` = newest. */
  getAccountHistory(
    account: string,
    from: number,
    limit: number,
    operationFilter?: HiveOperationFilter,
  ): Promise<HiveAccountHistoryPage | null>;

  getDynamicGlobalProperties(): Promise<HiveDynamicGlobalProperties | undefined>;

  getRewardFund(name?: string): Promise<HiveRewardFund | undefined>;
}

export interface GetVoteInterface {
  voter: string;
  author: string;
  permlink: string;
}
