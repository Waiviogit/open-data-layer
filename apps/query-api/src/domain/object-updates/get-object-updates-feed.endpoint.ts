import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ObjectAuthority, ValidityVote } from '@opden-data-layer/core';
import type { VoterWaivPowerMap } from '@opden-data-layer/objects-domain';
import { computeApprovePercent } from '@opden-data-layer/objects-domain';
import { ObjectAuthorityRepository, ObjectsCoreRepository, UpdatesFeedRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { feedItemImagePreviewUrls } from '../object-projection/image-display-url';
import {
  decodeUpdatesCursor,
  encodeUpdatesCursor,
  type UpdatesApprovalCursorPayload,
  type UpdatesRecencyCursorPayload,
} from './updates-cursor';
import type {
  ObjectUpdateFeedItemDto,
  ObjectUpdatesFeedQuery,
  ObjectUpdatesFeedResponseDto,
} from './schemas/object-updates-feed.schema';

export interface GetObjectUpdatesFeedInput {
  objectId: string;
  query: ObjectUpdatesFeedQuery;
  governanceObjectIdFromHeader?: string;
  viewerAccount?: string | undefined;
}

@Injectable()
export class GetObjectUpdatesFeedEndpoint {
  constructor(
    private readonly objectsCore: ObjectsCoreRepository,
    private readonly updatesFeedRepo: UpdatesFeedRepository,
    private readonly objectAuthorityRepo: ObjectAuthorityRepository,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: GetObjectUpdatesFeedInput): Promise<ObjectUpdatesFeedResponseDto | null> {
    const core = await this.objectsCore.findByObjectId(input.objectId);
    if (!core) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );
    const authorities = await this.objectAuthorityRepo.findByObjectId(input.objectId);

    const filter = {
      updateType: input.query.update_type,
      locale: input.query.locale,
    };

    if (input.query.sort === 'recency') {
      return this.recencyPage(input, governance, authorities, filter);
    }
    return this.approvalPage(input, governance, authorities, filter);
  }

  private async recencyPage(
    input: GetObjectUpdatesFeedInput,
    governance: Parameters<typeof computeApprovePercent>[2],
    authorities: ObjectAuthority[],
    filter: { updateType?: string; locale?: string },
  ): Promise<ObjectUpdatesFeedResponseDto> {
    const limit = input.query.limit;
    const rawDecoded = input.query.cursor ? decodeUpdatesCursor(input.query.cursor) : null;
    const decoded =
      rawDecoded?.kind === 'recency'
        ? rawDecoded
        : null;

    const rows = await this.updatesFeedRepo.findRecencyPage({
      objectId: input.objectId,
      ...filter,
      limit: limit + 1,
      cursorCreatedAt:
        decoded != null ? Number(decoded.created_at_unix) : undefined,
      cursorUpdateId: decoded?.update_id,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = await this.buildItemsForPage(
      input.objectId,
      pageRows,
      governance,
      authorities,
      input.viewerAccount,
    );

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1]!;
      const createdAt = Number(last.row.created_at_unix);
      if (Number.isFinite(createdAt) && last.row.update_id.length > 0) {
        const payload: UpdatesRecencyCursorPayload = {
          kind: 'recency',
          created_at_unix: Math.trunc(createdAt),
          update_id: last.row.update_id,
        };
        nextCursor = encodeUpdatesCursor(payload);
      }
    }

    return {
      items,
      cursor: nextCursor,
      hasMore: nextCursor !== null ? hasMore : false,
    };
  }

  private async approvalPage(
    input: GetObjectUpdatesFeedInput,
    governance: Parameters<typeof computeApprovePercent>[2],
    authorities: ObjectAuthority[],
    filter: { updateType?: string; locale?: string },
  ): Promise<ObjectUpdatesFeedResponseDto> {
    const limit = input.query.limit;
    const rawDecoded = input.query.cursor ? decodeUpdatesCursor(input.query.cursor) : null;
    let offset = 0;
    if (rawDecoded?.kind === 'approval') {
      offset = rawDecoded.offset;
    }

    const allRows = await this.updatesFeedRepo.findAllForApprovalSort({
      objectId: input.objectId,
      ...filter,
    });

    const updateIds = allRows.map((r) => r.row.update_id);
    const votes = await this.updatesFeedRepo.findValidityVotesForObjectAndUpdates(
      input.objectId,
      updateIds,
    );
    const voterNames = [...new Set(votes.map((v) => v.voter))];
    const powersMap = await this.updatesFeedRepo.findWaivPowersByAccounts(voterNames);
    const voterWaivPowers: VoterWaivPowerMap = powersMap;

    const withPercent = allRows.map((jr) => ({
      jr,
      approve_percent: computeApprovePercent(jr.row, votes, governance, voterWaivPowers, authorities),
    }));
    withPercent.sort((a, b) => {
      if (b.approve_percent !== a.approve_percent) {
        return b.approve_percent - a.approve_percent;
      }
      if (b.jr.row.created_at_unix !== a.jr.row.created_at_unix) {
        return b.jr.row.created_at_unix - a.jr.row.created_at_unix;
      }
      if (a.jr.row.update_id < b.jr.row.update_id) return 1;
      if (a.jr.row.update_id > b.jr.row.update_id) return -1;
      return 0;
    });

    const slice = withPercent.slice(offset, offset + limit + 1);
    const hasMore = slice.length > limit;
    const pageSlice = hasMore ? slice.slice(0, limit) : slice;

    const items: ObjectUpdateFeedItemDto[] = pageSlice.map((p) =>
      this.toDto(
        p.jr,
        p.approve_percent,
        votes,
        input.viewerAccount,
      ),
    );

    const nextCursor =
      hasMore
        ? encodeUpdatesCursor({
            kind: 'approval',
            offset: offset + limit,
          } satisfies UpdatesApprovalCursorPayload)
        : null;

    return { items, cursor: nextCursor, hasMore };
  }

  private async buildItemsForPage(
    objectId: string,
    pageRows: Awaited<ReturnType<UpdatesFeedRepository['findRecencyPage']>>,
    governance: Parameters<typeof computeApprovePercent>[2],
    authorities: ObjectAuthority[],
    viewerAccount: string | undefined,
  ): Promise<ObjectUpdateFeedItemDto[]> {
    const updateIds = pageRows.map((r) => r.row.update_id);
    if (updateIds.length === 0) {
      return [];
    }
    const votes = await this.updatesFeedRepo.findValidityVotesForObjectAndUpdates(objectId, updateIds);
    const voterNames = [...new Set(votes.map((v) => v.voter))];
    const powersMap = await this.updatesFeedRepo.findWaivPowersByAccounts(voterNames);
    const voterWaivPowers: VoterWaivPowerMap = powersMap;

    return pageRows.map((jr) =>
      this.toDto(
        jr,
        computeApprovePercent(jr.row, votes, governance, voterWaivPowers, authorities),
        votes,
        viewerAccount,
      ),
    );
  }

  private toDto(
    jr: {
      row: Parameters<typeof computeApprovePercent>[0];
      creator_wobjects_weight: number;
      geo_lat: number | null;
      geo_lon: number | null;
    },
    approvePercent: number,
    allVotes: ValidityVote[],
    viewerAccount: string | undefined,
  ): ObjectUpdateFeedItemDto {
    const updateVotes = allVotes.filter((v) => v.update_id === jr.row.update_id);
    let forC = 0;
    let againstC = 0;
    for (const v of updateVotes) {
      if (v.vote === 'for') forC += 1;
      else againstC += 1;
    }

    const viewer = viewerAccount?.trim();
    let viewerVote: 'for' | 'against' | null = null;
    if (viewer && viewer.length > 0) {
      const mine = updateVotes.filter((v) => v.voter === viewer);
      if (mine.length > 0) {
        const latest = mine.reduce((best, v) => (v.event_seq > best.event_seq ? v : best));
        viewerVote = latest.vote;
      }
    }

    const value_geo =
      jr.geo_lat != null &&
      jr.geo_lon != null &&
      Number.isFinite(jr.geo_lat) &&
      Number.isFinite(jr.geo_lon)
        ? { latitude: jr.geo_lat, longitude: jr.geo_lon }
        : null;

    const gateway =
      this.config.get<string | undefined>('ipfs.gatewayUrl') ?? 'https://ipfs.io';
    const image_preview_urls = feedItemImagePreviewUrls(
      jr.row.update_type,
      jr.row.value_text,
      jr.row.value_json ?? null,
      gateway,
    );

    return {
      update_id: jr.row.update_id,
      object_id: jr.row.object_id,
      update_type: jr.row.update_type,
      creator: jr.row.creator,
      creator_wobjects_weight: jr.creator_wobjects_weight,
      locale: jr.row.locale,
      created_at_unix: jr.row.created_at_unix,
      value_text: jr.row.value_text,
      value_geo,
      value_json: jr.row.value_json ?? null,
      image_preview_urls,
      approve_percent: approvePercent,
      for_vote_count: forC,
      against_vote_count: againstC,
      viewer_vote: viewerVote,
    };
  }
}
