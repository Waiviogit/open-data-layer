import { Injectable, Logger } from '@nestjs/common';
import type { HiveContentType } from '@opden-data-layer/clients';
import { HiveClient } from '@opden-data-layer/clients';
import type { NewPost, NewPostActiveVote, NewPostObject, PostActiveVote } from '@opden-data-layer/core';
import { ObjectsCoreRepository } from '../../repositories/objects-core.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import { mergeHiveCommentBody } from './body-merge';
import {
  blockTimestampToUnixSeconds,
  cashoutTimeFromBlock,
  formatHiveDateTime,
} from './hive-datetime.util';
import type { CommentOperationPayload } from './hive-comment.schema';
import { parseJsonMetadata } from './json-metadata.util';
import { bindPostObjectsToPost, parsePostObjectsForInsert, validateWobjectPercentSum } from './post-objects.parse';
import { detectPostLanguagesBcp47 } from './post-languages';
import { extractLinks, extractMentions } from './thread-extractors';

function toBigIntNaive(v: number | string | undefined | null): bigint {
  if (v === undefined || v === null) {
    return 0n;
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    return 0n;
  }
  return BigInt(Math.trunc(n));
}

@Injectable()
export class PostUpsertService {
  private readonly logger = new Logger(PostUpsertService.name);

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly hiveClient: HiveClient,
  ) {}

  /**
   * Root post path only (`parent_author === ''`); caller ensures metadata is truthy.
   */
  async upsertRootPost(
    op: CommentOperationPayload,
    metadata: Record<string, unknown> | null,
    blockTimestamp: string,
  ): Promise<void> {
    const author = op.author;
    const permlink = op.permlink;
    const existing = await this.postsRepository.findByKey(author, permlink);

    let body = op.body ?? '';
    if (!body.trim() && existing?.body) {
      body = existing.body;
    }

    let jsonMetadata = op.json_metadata ?? '';
    if (!jsonMetadata.trim() && existing?.json_metadata) {
      jsonMetadata = existing.json_metadata;
    }

    const objectsRaw = parsePostObjectsForInsert(metadata, body);
    let objects = bindPostObjectsToPost(objectsRaw, author, permlink);
    objects = await this.resolvePostObjectsAgainstCore(objects);
    if (!validateWobjectPercentSum(objects)) {
      this.logger.warn(
        `Skipping post ${author}/${permlink}: invalid wobject percent sum`,
      );
      return;
    }

    const languages = await detectPostLanguagesBcp47(body, op.title);
    const links = extractLinks(body);
    const mentions = extractMentions(body);

    if (!existing) {
      const createdUnix = blockTimestampToUnixSeconds(blockTimestamp);
      const createdStr = formatHiveDateTime(blockTimestamp);
      const row = this.buildCreateRow(op, body, jsonMetadata, blockTimestamp, createdUnix, createdStr);
      const votes: NewPostActiveVote[] = [];
      await this.postsRepository.upsertPostWithSatellites(row, {
        objects,
        links,
        mentions,
        languages,
        votes,
      });
      return;
    }

    const hive = await this.hiveClient.getContent(author, permlink);
    if (!hive?.author) {
      this.logger.warn(
        `update post ${author}/${permlink}: chain content missing; skipping`,
      );
      return;
    }

    const mergedBody = mergeHiveCommentBody(body, hive.body ?? '');
    const mergedMetadata =
      jsonMetadata.trim() || !(hive.json_metadata ?? '').trim()
        ? jsonMetadata
        : hive.json_metadata;

    const metaForObjects =
      parseJsonMetadata(mergedMetadata) ?? metadata;
    const mergedObjectsBound = bindPostObjectsToPost(
      parsePostObjectsForInsert(metaForObjects, mergedBody),
      author,
      permlink,
    );
    const mergedObjects = await this.resolvePostObjectsAgainstCore(mergedObjectsBound);
    if (!validateWobjectPercentSum(mergedObjects)) {
      this.logger.warn(
        `Skipping post update ${author}/${permlink}: invalid wobject percent sum`,
      );
      return;
    }

    const storedVotes = await this.postsRepository.findActiveVotes(author, permlink);
    const voteRows = this.mergeVotes(hive, storedVotes);

    const finalLanguages = await detectPostLanguagesBcp47(mergedBody, op.title ?? hive.title ?? '');
    const finalLinks = extractLinks(mergedBody);
    const finalMentions = extractMentions(mergedBody);

    const row = this.buildUpdateRow(
      op,
      hive,
      mergedBody,
      mergedMetadata,
      existing,
      blockTimestamp,
    );

    await this.postsRepository.upsertPostWithSatellites(row, {
      objects: mergedObjects,
      links: finalLinks,
      mentions: finalMentions,
      languages: finalLanguages,
      votes: voteRows,
    });
  }

  private buildCreateRow(
    op: CommentOperationPayload,
    body: string,
    jsonMetadata: string,
    blockTimestamp: string,
    createdUnix: number,
    createdStr: string,
  ): NewPost {
    const author = op.author;
    const permlink = op.permlink;
    const parentPermlink = op.parent_permlink ?? '';
    return {
      author,
      permlink,
      hive_id: null,
      author_reputation: 0n,
      author_weight: 0,
      parent_author: '',
      parent_permlink: parentPermlink,
      title: op.title ?? '',
      body,
      json_metadata: jsonMetadata,
      app: null,
      depth: 0,
      category: null,
      last_update: null,
      created: createdStr,
      active: null,
      last_payout: null,
      children: 0,
      net_rshares: 0n,
      abs_rshares: 0n,
      vote_rshares: 0n,
      children_abs_rshares: null,
      cashout_time: cashoutTimeFromBlock(blockTimestamp),
      reward_weight: null,
      total_payout_value: '0.000 HBD',
      curator_payout_value: '0.000 HBD',
      author_rewards: null,
      net_votes: null,
      root_author: author,
      root_permlink: permlink,
      root_title: op.title ?? '',
      max_accepted_payout: '1000000.000 HBD',
      percent_steem_dollars: null,
      allow_replies: null,
      allow_votes: null,
      allow_curation_rewards: null,
      beneficiaries: [],
      url: `/${parentPermlink}/@${author}/${permlink}`,
      pending_payout_value: '0.000 HBD',
      total_pending_payout_value: '0.000 HBD',
      total_vote_weight: null,
      promoted: null,
      body_length: body.length,
      net_rshares_waiv: 0,
      total_payout_waiv: 0,
      total_rewards_waiv: 0,
      created_unix: createdUnix,
    };
  }

  private buildUpdateRow(
    op: CommentOperationPayload,
    hive: HiveContentType,
    mergedBody: string,
    mergedMetadata: string,
    existing: { created_unix: number; url: string | null },
    blockTimestamp: string,
  ): NewPost {
    const author = op.author;
    const permlink = op.permlink;
    const totalVoteWeight =
      hive.total_vote_weight !== undefined && hive.total_vote_weight !== null
        ? BigInt(Math.trunc(hive.total_vote_weight))
        : null;

    return {
      author,
      permlink,
      hive_id:
        hive.id !== undefined && hive.id !== null ? Number(hive.id) : null,
      author_reputation: toBigIntNaive(hive.author_reputation),
      author_weight: hive.author_weight ?? 0,
      parent_author: hive.parent_author ?? op.parent_author ?? '',
      parent_permlink: hive.parent_permlink ?? op.parent_permlink ?? '',
      title: op.title ?? hive.title ?? '',
      body: mergedBody,
      json_metadata: mergedMetadata,
      app: hive.app?.trim() ? hive.app : null,
      depth:
        hive.depth !== undefined && hive.depth !== null
          ? Number(hive.depth)
          : null,
      category: hive.category?.trim() ? hive.category : null,
      last_update: hive.last_update ?? null,
      created: hive.created ?? null,
      active: hive.active ?? null,
      last_payout: hive.last_payout ?? null,
      children: hive.children ?? 0,
      net_rshares: toBigIntNaive(hive.net_rshares),
      abs_rshares: toBigIntNaive(hive.abs_rshares),
      vote_rshares: toBigIntNaive(hive.vote_rshares),
      children_abs_rshares:
        hive.children_abs_rshares !== undefined &&
        hive.children_abs_rshares !== null
          ? toBigIntNaive(hive.children_abs_rshares)
          : null,
      cashout_time: hive.cashout_time ?? cashoutTimeFromBlock(blockTimestamp),
      reward_weight:
        hive.reward_weight !== undefined && hive.reward_weight !== null
          ? String(hive.reward_weight)
          : null,
      total_payout_value: hive.total_payout_value ?? '0.000 HBD',
      curator_payout_value: hive.curator_payout_value ?? '0.000 HBD',
      author_rewards: hive.author_rewards ?? null,
      net_votes: hive.net_votes ?? null,
      root_author: hive.root_author ?? author,
      root_permlink: hive.root_permlink ?? permlink,
      root_title: hive.root_title ?? null,
      max_accepted_payout: hive.max_accepted_payout ?? '1000000.000 HBD',
      percent_steem_dollars: hive.percent_hbd ?? null,
      allow_replies: hive.allow_replies ?? null,
      allow_votes: hive.allow_votes ?? null,
      allow_curation_rewards: hive.allow_curation_rewards ?? null,
      beneficiaries: (hive.beneficiaries ?? []) as NewPost['beneficiaries'],
      url: hive.url?.trim() ? hive.url : existing.url,
      pending_payout_value: hive.pending_payout_value ?? '0.000 HBD',
      total_pending_payout_value:
        hive.total_pending_payout_value ?? '0.000 HBD',
      total_vote_weight: totalVoteWeight,
      promoted: hive.promoted ?? null,
      body_length: mergedBody.length,
      net_rshares_waiv: 0,
      total_payout_waiv: 0,
      total_rewards_waiv: 0,
      created_unix: existing.created_unix,
    };
  }

  private mergeVotes(
    hive: HiveContentType,
    stored: PostActiveVote[],
  ): NewPostActiveVote[] {
    const author = hive.author;
    const permlink = hive.permlink;
    const waivByVoter = new Map(
      stored.map((v) => [v.voter, v.rshares_waiv ?? null]),
    );
    const hiveVotes = hive.active_votes ?? [];
    const byVoter = new Map<string, NewPostActiveVote>();

    for (const v of hiveVotes) {
      const rshares = toBigIntNaive(v.rshares);
      const waiv = waivByVoter.get(v.voter) ?? null;
      const weight = Math.round(Number(rshares) * 1e-6);
      byVoter.set(v.voter, {
        author,
        permlink,
        voter: v.voter,
        weight: Number.isFinite(v.weight) ? v.weight : weight,
        percent: v.percent ?? null,
        rshares,
        rshares_waiv: waiv,
      });
    }

    for (const v of stored) {
      if (!byVoter.has(v.voter)) {
        byVoter.set(v.voter, {
          author,
          permlink,
          voter: v.voter,
          weight: v.weight ?? null,
          percent: v.percent ?? null,
          rshares: v.rshares ?? null,
          rshares_waiv: v.rshares_waiv ?? null,
        });
      }
    }

    return [...byVoter.values()];
  }

  /** Keep only object_ids present in `objects_core`; set `object_type` from core. */
  private async resolvePostObjectsAgainstCore(
    objects: NewPostObject[],
  ): Promise<NewPostObject[]> {
    if (objects.length === 0) {
      return [];
    }
    const types = await this.objectsCoreRepository.findObjectTypesByIds(
      objects.map((o) => o.object_id),
    );
    return objects
      .filter((o) => types.has(o.object_id))
      .map((o) => ({
        ...o,
        object_type: types.get(o.object_id) ?? null,
      }));
  }
}
