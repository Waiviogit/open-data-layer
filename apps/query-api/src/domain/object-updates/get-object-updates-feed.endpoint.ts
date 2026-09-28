import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectOwnership, ValidityVote } from '@opden-data-layer/odl-db-types';

import type { GovernanceSnapshot, VoterWaivPowerMap } from '@opden-data-layer/objects-domain';
import {
  computeApprovePercent,
  computeCuratorSet,
  resolveUpdateValidity,
} from '@opden-data-layer/objects-domain';
import { ObjectOwnershipRepository, ObjectsCoreRepository, UpdatesFeedRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { feedItemImagePreviewUrls } from '../object-projection/image-display-url';
import {
  decodeUpdatesCursor,
  encodeUpdatesCursor,
  type UpdatesApprovalCursorPayload,
  type UpdatesRecencyCursorPayload,
} from './updates-cursor';
import {
  previewValidityVoters,
  resolveLatestValidityVoters,
} from './resolve-latest-validity-votes';
import type {
  DecisivePrivilegedVoteDto,
  ObjectUpdateFeedItemDto,
  ObjectUpdatesFeedQuery,
  ObjectUpdatesFeedResponseDto,
} from './schemas/object-updates-feed.schema';
import type { RankVoteProjection } from '../object-projection/projected-object.types';
import { emptyRankVoteProjection } from '../object-projection/projected-object.types';

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
    private readonly objectOwnershipRepo: ObjectOwnershipRepository,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: GetObjectUpdatesFeedInput): Promise<ObjectUpdatesFeedResponseDto | null> {
    const core = await this.objectsCore.findByObjectIdForPage(input.objectId);
    if (!core) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );
    const ownerships = await this.objectOwnershipRepo.findByObjectId(input.objectId);

    const filter = {
      updateType: input.query.update_type,
      locale: input.query.locale,
    };

    if (input.query.sort === 'recency') {
      return this.recencyPage(input, governance, ownerships, filter);
    }
    return this.approvalPage(input, governance, ownerships, filter);
  }

  async executeByUpdateId(input: {
    objectId: string;
    updateId: string;
    governanceObjectIdFromHeader?: string;
    viewerAccount?: string;
  }): Promise<ObjectUpdateFeedItemDto | null> {
    const core = await this.objectsCore.findByObjectIdForPage(input.objectId);
    if (!core) {
      return null;
    }

    const joinRow = await this.updatesFeedRepo.findJoinRowByObjectAndUpdateId(
      input.objectId,
      input.updateId,
    );
    if (!joinRow) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );
    const ownerships = await this.objectOwnershipRepo.findByObjectId(input.objectId);
    const items = await this.buildItemsForPage(
      input.objectId,
      [joinRow],
      governance,
      ownerships,
      input.viewerAccount,
    );
    return items[0] ?? null;
  }

  private async recencyPage(
    input: GetObjectUpdatesFeedInput,
    governance: Parameters<typeof computeApprovePercent>[2],
    ownerships: ObjectOwnership[],
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
      ownerships,
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
    ownerships: ObjectOwnership[],
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
    const [votes, rankVoteProjection] = await Promise.all([
      this.updatesFeedRepo.findValidityVotesForObjectAndUpdates(
        input.objectId,
        updateIds,
      ),
      this.updatesFeedRepo.findRankVoteProjectionForUpdates(
        input.objectId,
        updateIds,
        input.viewerAccount,
      ),
    ]);
    const voterNames = [...new Set(votes.map((v) => v.voter))];
    const powersMap = await this.updatesFeedRepo.findWaivPowersByAccounts(voterNames);
    const voterWaivPowers: VoterWaivPowerMap = powersMap;

    const withPercent = allRows.map((jr) => ({
      jr,
      approve_percent: computeApprovePercent(jr.row, votes, governance, voterWaivPowers, ownerships),
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

    const curatorSet = computeCuratorSet(ownerships, governance);
    const items: ObjectUpdateFeedItemDto[] = pageSlice.map((p) =>
      this.toDto(
        p.jr,
        p.approve_percent,
        votes,
        governance,
        ownerships,
        curatorSet,
        voterWaivPowers,
        input.viewerAccount,
        rankVoteProjection,
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
    ownerships: ObjectOwnership[],
    viewerAccount: string | undefined,
  ): Promise<ObjectUpdateFeedItemDto[]> {
    const updateIds = pageRows.map((r) => r.row.update_id);
    if (updateIds.length === 0) {
      return [];
    }
    const [votes, rankVoteProjection] = await Promise.all([
      this.updatesFeedRepo.findValidityVotesForObjectAndUpdates(objectId, updateIds),
      this.updatesFeedRepo.findRankVoteProjectionForUpdates(
        objectId,
        updateIds,
        viewerAccount,
      ),
    ]);
    const voterNames = [...new Set(votes.map((v) => v.voter))];
    const powersMap = await this.updatesFeedRepo.findWaivPowersByAccounts(voterNames);
    const voterWaivPowers: VoterWaivPowerMap = powersMap;
    const curatorSet = computeCuratorSet(ownerships, governance);

    return pageRows.map((jr) =>
      this.toDto(
        jr,
        computeApprovePercent(jr.row, votes, governance, voterWaivPowers, ownerships),
        votes,
        governance,
        ownerships,
        curatorSet,
        voterWaivPowers,
        viewerAccount,
        rankVoteProjection,
      ),
    );
  }

  private coerceRankScore(raw: unknown): number | null {
    if (raw == null) {
      return null;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'bigint') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const n = Number(raw.trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private resolveViewerRank(
    updateId: string,
    viewerAccount: string | undefined,
    rankVoteProjection: RankVoteProjection,
  ): number | null {
    if (!viewerAccount?.trim()) {
      return null;
    }
    const raw = rankVoteProjection.viewerRankByUpdateId.get(updateId);
    return raw != null && typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
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
    governance: GovernanceSnapshot,
    ownerships: ObjectOwnership[],
    curatorSet: Set<string>,
    voterWaivPowers: VoterWaivPowerMap,
    viewerAccount: string | undefined,
    rankVoteProjection: RankVoteProjection = emptyRankVoteProjection(),
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
      this.config.get<string | undefined>('ipfs.contentBaseUrl');
    const image_preview_urls = feedItemImagePreviewUrls(
      jr.row.update_type,
      jr.row.value_text,
      jr.row.value_json ?? null,
      gateway,
    );

    const validity = resolveUpdateValidity(
      jr.row,
      allVotes,
      curatorSet,
      governance,
      voterWaivPowers,
      ownerships,
    );
    const decisive_privileged_vote = this.mapDecisivePrivilegedVote(validity);
    const { forVoters, againstVoters } = resolveLatestValidityVoters(updateVotes);

    return {
      update_id: jr.row.update_id,
      object_id: jr.row.object_id,
      update_type: jr.row.update_type,
      creator: jr.row.creator,
      creator_wobjects_weight: jr.creator_wobjects_weight,
      locale: jr.row.locale,
      created_at_unix: jr.row.created_at_unix,
      transaction_id: jr.row.transaction_id,
      value_text: jr.row.value_text,
      value_geo,
      value_json: jr.row.value_json ?? null,
      image_preview_urls,
      approve_percent: approvePercent,
      for_vote_count: forC,
      against_vote_count: againstC,
      for_preview_voters: previewValidityVoters(forVoters.map((entry) => entry.voter)),
      against_preview_voters: previewValidityVoters(againstVoters.map((entry) => entry.voter)),
      viewer_vote: viewerVote,
      decisive_privileged_vote,
      rank_score: this.coerceRankScore(jr.row.rank_score),
      viewer_rank: this.resolveViewerRank(jr.row.update_id, viewerAccount, rankVoteProjection),
    };
  }

  private mapDecisivePrivilegedVote(
    validity: ReturnType<typeof resolveUpdateValidity>,
  ): DecisivePrivilegedVoteDto | null {
    if (
      (validity.validity_tier === 'admin' || validity.validity_tier === 'trusted') &&
      validity.decisive_voter != null &&
      validity.decisive_vote != null
    ) {
      return {
        tier: validity.validity_tier,
        vote: validity.decisive_vote,
        voter: validity.decisive_voter,
      };
    }
    return null;
  }
}
