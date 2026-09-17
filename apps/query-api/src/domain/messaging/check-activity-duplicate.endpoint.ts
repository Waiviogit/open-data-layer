import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_DEDUP_WINDOW_SEC,
  ACTIVITY_FINGERPRINT_VERSION,
  computeActivityFingerprint,
  formatPHashHex,
  isNearDuplicate,
  parsePHashHex,
} from '@opden-data-layer/core';

import { MessagingRepository, ObjectsCoreRepository } from '../../repositories';
import type { ActivityDedupCheckBody } from './schemas/messaging.schema';
import {
  mapMessageToDto,
  type MessageDto,
  type MessageSourceDto,
} from './message-projection';

export type ActivityDedupCheckDto = {
  duplicate: boolean;
  reason: 'source' | 'simhash' | 'phash' | null;
  match: MessageDto | null;
  fingerprint: {
    v: number;
    text_simhash: string | null;
    normalized_length: number;
  };
  candidates_scanned: number;
};

@Injectable()
export class CheckActivityDuplicateEndpoint {
  constructor(
    private readonly objectsCoreRepo: ObjectsCoreRepository,
    private readonly messagingRepo: MessagingRepository,
  ) {}

  async execute(
    objectId: string,
    body: ActivityDedupCheckBody,
  ): Promise<ActivityDedupCheckDto | null> {
    const trimmedId = objectId.trim();
    if (!trimmedId) {
      return null;
    }

    const core = await this.objectsCoreRepo.findByObjectIdForPage(trimmedId);
    if (!core) {
      return null;
    }

    const fingerprint = this.resolveFingerprint(body);
    const channel = await this.messagingRepo.findObjectChannel(trimmedId);

    if (channel == null) {
      return {
        duplicate: false,
        reason: null,
        match: null,
        fingerprint,
        candidates_scanned: 0,
      };
    }

    if (body.source != null) {
      const exact = await this.messagingRepo.findObjectMessageBySource(
        channel.channel_id,
        body.source.platform,
        body.source.id,
      );
      if (exact) {
        return {
          duplicate: true,
          reason: 'source',
          match: mapMessageToDto(exact, {
            requestedObjectId: trimmedId,
            channelObjectId: channel.object_id,
            duplicateCount: 1,
          }),
          fingerprint,
          candidates_scanned: 0,
        };
      }
    }

    const fpV = body.fp_v ?? fingerprint.v;
    const textSimhash =
      body.text_simhash != null
        ? parsePHashHex(body.text_simhash)
        : fingerprint.textSimhash;

    const imagePhashes = (body.image_phashes ?? [])
      .map((hex) => parsePHashHex(hex))
      .filter((v): v is bigint => v != null);

    if (textSimhash == null && imagePhashes.length === 0 && body.source == null) {
      return {
        duplicate: false,
        reason: null,
        match: null,
        fingerprint,
        candidates_scanned: 0,
      };
    }

    const sortUnix = body.original_created_at_unix;
    const fromUnix = sortUnix - ACTIVITY_DEDUP_WINDOW_SEC;
    const toUnix = sortUnix + ACTIVITY_DEDUP_WINDOW_SEC;
    const candidates = await this.messagingRepo.listActivityDedupCandidates(
      channel.channel_id,
      fpV,
      fromUnix,
      toUnix,
    );

    const incoming = {
      fingerprintV: fpV,
      textSimhash,
      imagePhashes,
      sourceTimeUnix: sortUnix,
    };

    for (const candidate of candidates) {
      const reason = isNearDuplicate(incoming, {
        fingerprintV: fpV,
        textSimhash: candidate.text_simhash,
        imagePhashes: candidate.image_phashes,
        sourceTimeUnix: candidate.sort_time_unix,
      });
      if (reason == null) {
        continue;
      }
      const matchRow = await this.messagingRepo.findById(candidate.message_id);
      if (!matchRow) {
        continue;
      }
      return {
        duplicate: true,
        reason,
        match: mapMessageToDto(matchRow, {
          requestedObjectId: trimmedId,
          channelObjectId: channel.object_id,
          duplicateCount: 1,
        }),
        fingerprint,
        candidates_scanned: candidates.length,
      };
    }

    return {
      duplicate: false,
      reason: null,
      match: null,
      fingerprint,
      candidates_scanned: candidates.length,
    };
  }

  private resolveFingerprint(body: ActivityDedupCheckBody): {
    v: number;
    text_simhash: string | null;
    normalized_length: number;
    textSimhash: bigint | null;
  } {
    if (body.original_text != null && body.original_text.trim().length > 0) {
      const computed = computeActivityFingerprint(body.original_text);
      return {
        v: computed.v,
        text_simhash:
          computed.textSimhash != null ? formatPHashHex(computed.textSimhash) : null,
        normalized_length: computed.normalizedLength,
        textSimhash: computed.textSimhash,
      };
    }

    const parsed =
      body.text_simhash != null ? parsePHashHex(body.text_simhash) : null;

    return {
      v: body.fp_v ?? ACTIVITY_FINGERPRINT_VERSION,
      text_simhash: body.text_simhash ?? null,
      normalized_length: 0,
      textSimhash: parsed,
    };
  }
}

export type { MessageSourceDto };
