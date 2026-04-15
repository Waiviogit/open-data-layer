import { Injectable } from '@nestjs/common';
import type { NewThread } from '@opden-data-layer/core';
import { ThreadsRepository } from '../../repositories/threads.repository';
import {
  DEFAULT_PERCENT_HBD,
  getThreadType,
  SEED_TICKERS,
  THREAD_TYPE_ECENCY,
} from '../../constants/thread-accounts';
import { blockTimestampToUnixSeconds, cashoutTimeFromBlock } from './hive-datetime.util';
import type { CommentOperationPayload } from './hive-comment.schema';
import {
  detectBulkMessage,
  extractCryptoTickers,
  extractHashtags,
  extractHashtagsFromMetadata,
  extractImages,
  extractLinks,
  extractMentions,
} from './thread-extractors';

export interface ThreadParseOptions {
  percentHbd?: number;
  blockTimestamp: string;
}

@Injectable()
export class ThreadParseService {
  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async parseThread(
    op: CommentOperationPayload,
    options: ThreadParseOptions,
  ): Promise<void> {
    const threadType = getThreadType(op.parent_author);
    const metadataStr = op.json_metadata ?? '';
    const body = op.body ?? '';

    const hashtags =
      threadType === THREAD_TYPE_ECENCY
        ? extractHashtagsFromMetadata(metadataStr)
        : extractHashtags(body);

    const tickers = extractCryptoTickers(metadataStr, [...SEED_TICKERS]);
    const createdUnix = blockTimestampToUnixSeconds(options.blockTimestamp);

    const row: NewThread = {
      author: op.author,
      permlink: op.permlink,
      parent_author: op.parent_author,
      parent_permlink: op.parent_permlink,
      body,
      created: options.blockTimestamp,
      replies: [],
      children: 0,
      depth: 1,
      author_reputation: null,
      deleted: false,
      tickers,
      mentions: extractMentions(body),
      hashtags,
      links: extractLinks(body),
      images: extractImages(metadataStr),
      threadstorm: false,
      net_rshares: null,
      pending_payout_value: null,
      total_payout_value: null,
      percent_hbd: options.percentHbd ?? DEFAULT_PERCENT_HBD,
      cashout_time: cashoutTimeFromBlock(options.blockTimestamp),
      bulk_message: detectBulkMessage(metadataStr),
      type: threadType,
      created_unix: createdUnix,
      updated_at_unix: createdUnix,
    };

    await this.threadsRepository.upsertThread(row);
  }

  async parseThreadReply(op: CommentOperationPayload): Promise<void> {
    const ref = `${op.author}/${op.permlink}`;
    await this.threadsRepository.addReply(
      op.parent_author,
      op.parent_permlink,
      ref,
    );
  }
}
