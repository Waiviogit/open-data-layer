import { Injectable } from '@nestjs/common';
import { DiscoverRepository } from '../../repositories';
import { getTagCategoryOrderForObjectType } from './discover-registry.utils';
import { groupDiscoverTagCategories } from './discover-tag-categories.utils';
import { parseTagFilters } from './get-discover-objects.endpoint';
import type { DiscoverTagCategoriesQuery } from './discover-query.schema';
import type { DiscoverTagCategoriesResponseDto } from './discover.types';

export interface GetDiscoverTagCategoriesInput {
  query: DiscoverTagCategoriesQuery;
}

@Injectable()
export class GetDiscoverTagCategoriesEndpoint {
  constructor(private readonly discoverRepo: DiscoverRepository) {}

  async execute(input: GetDiscoverTagCategoriesInput): Promise<DiscoverTagCategoriesResponseDto> {
    const objectType = input.query.object_type.trim();
    const activeTags = parseTagFilters(input.query.tags ?? []);
    const rows = await this.discoverRepo.getTagCategories(objectType, activeTags);
    const order = getTagCategoryOrderForObjectType(objectType);
    return groupDiscoverTagCategories(rows, order);
  }
}
