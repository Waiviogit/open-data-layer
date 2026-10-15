import { Injectable } from '@nestjs/common';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectsCoreRepository,
  PostObjectRelatedImagesRepository,
} from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { collectRemovePostKeysFromView } from './related-album-remove-filter';
import type {
  RelatedAlbumImageDto,
  RelatedAlbumListQuery,
  RelatedAlbumListResponseDto,
  RelatedAlbumPreviewQuery,
  RelatedAlbumPreviewResponseDto,
} from './schemas/related-album.schema';

function toDto(row: {
  image_url: string;
  author: string;
  permlink: string;
}): RelatedAlbumImageDto {
  return {
    url: row.image_url,
    postAuthor: row.author,
    postPermlink: row.permlink,
  };
}

function parseOffsetCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const n = Number.parseInt(cursor, 10);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
}

@Injectable()
export class ObjectRelatedAlbumQuerySupport {
  constructor(
    private readonly objectsCore: ObjectsCoreRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
  ) {}

  async loadExcludedPostKeys(
    objectId: string,
    locale: string,
    governanceObjectIdFromHeader?: string,
  ): Promise<string[] | null> {
    const core = await this.objectsCore.findByObjectIdForPage(objectId);
    if (!core) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      governanceObjectIdFromHeader,
    );
    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds(
      [objectId],
      { includeRankVoteProjection: false },
    );
    const views = this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: [UPDATE_TYPES.REMOVE],
      locale,
      governance,
    });
    const view = views[0];
    if (!view) {
      return [];
    }
    return collectRemovePostKeysFromView(view);
  }
}

@Injectable()
export class GetObjectRelatedAlbumPreviewEndpoint {
  constructor(
    private readonly support: ObjectRelatedAlbumQuerySupport,
    private readonly relatedImagesRepo: PostObjectRelatedImagesRepository,
  ) {}

  async execute(
    objectId: string,
    query: RelatedAlbumPreviewQuery,
    locale: string,
    governanceObjectIdFromHeader?: string,
  ): Promise<RelatedAlbumPreviewResponseDto | null> {
    const id = objectId.trim();
    if (!id) {
      return null;
    }

    const excluded = await this.support.loadExcludedPostKeys(
      id,
      locale,
      governanceObjectIdFromHeader,
    );
    if (excluded === null) {
      return null;
    }

    const count = await this.relatedImagesRepo.countByObjectId(id, excluded);
    const rows = await this.relatedImagesRepo.findPreview(id, query.limit, excluded);
    return {
      count,
      items: rows.map(toDto),
    };
  }
}

@Injectable()
export class GetObjectRelatedAlbumEndpoint {
  constructor(
    private readonly support: ObjectRelatedAlbumQuerySupport,
    private readonly relatedImagesRepo: PostObjectRelatedImagesRepository,
  ) {}

  async execute(
    objectId: string,
    query: RelatedAlbumListQuery,
    locale: string,
    governanceObjectIdFromHeader?: string,
  ): Promise<RelatedAlbumListResponseDto | null> {
    const id = objectId.trim();
    if (!id) {
      return null;
    }

    const excluded = await this.support.loadExcludedPostKeys(
      id,
      locale,
      governanceObjectIdFromHeader,
    );
    if (excluded === null) {
      return null;
    }

    const skip = parseOffsetCursor(query.cursor);
    const count = await this.relatedImagesRepo.countByObjectId(id, excluded);
    const rows = await this.relatedImagesRepo.findPage(
      id,
      query.limit + 1,
      skip,
      excluded,
    );
    const hasMore = rows.length > query.limit;
    const trimmed = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore ? String(skip + trimmed.length) : null;
    return {
      count,
      items: trimmed.map(toDto),
      hasMore,
      cursor: nextCursor,
    };
  }
}
