import { Injectable } from '@nestjs/common';
import { DiscoverRepository } from '../../repositories';
import type { DiscoverUsersQuery } from './discover-query.schema';
import type { DiscoverUsersResponseDto } from './discover.types';

export interface GetDiscoverUsersInput {
  query: DiscoverUsersQuery;
  viewerAccount?: string;
}

@Injectable()
export class GetDiscoverUsersEndpoint {
  constructor(private readonly discoverRepo: DiscoverRepository) {}

  async execute(input: GetDiscoverUsersInput): Promise<DiscoverUsersResponseDto> {
    const q = input.query.q?.trim();
    const { rows, hasMore } = await this.discoverRepo.listUsers({
      q: q && q.length > 0 ? q : undefined,
      cursor: input.query.cursor,
      limit: input.query.limit,
      viewerAccount: input.viewerAccount,
    });

    const items = rows.map((r) => ({
      name: r.name,
      profile_image: r.profile_image,
      reputation: r.object_reputation,
      followers_count: r.followers_count,
      is_following: r.is_following,
    }));

    const last = rows[rows.length - 1];
    const cursor = hasMore && last ? this.discoverRepo.buildUserCursor(last) : null;

    return { items, cursor, hasMore };
  }
}
