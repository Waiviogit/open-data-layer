import { Injectable } from '@nestjs/common';
import { ObjectCategoriesRelatedRepository } from '../../repositories/object-categories-related.repository';
import type { UserCategoriesQuery, UserCategoriesResponse } from './categories-query.schema';
import { buildUserCategoriesResponse } from './build-user-categories-response';

@Injectable()
export class GetUserCategoriesEndpoint {
  constructor(
    private readonly objectCategoriesRelatedRepository: ObjectCategoriesRelatedRepository,
  ) {}

  async execute(username: string, query: UserCategoriesQuery): Promise<UserCategoriesResponse> {
    const trimmed = username.trim();
    if (trimmed.length === 0) {
      return { items: [], uncategorized_count: 0, show_other: false };
    }

    const rows = await this.objectCategoriesRelatedRepository.findByUserScope(trimmed, query.types);
    return buildUserCategoriesResponse(rows, query);
  }
}
