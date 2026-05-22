import type { ProjectedObject } from '../object-projection/projected-object.types';

export interface DiscoverObjectsResponseDto {
  items: ProjectedObject[];
  cursor: string | null;
  hasMore: boolean;
}

export interface DiscoverUserResult {
  name: string;
  profile_image: string | null;
  reputation: number;
  followers_count: number;
  is_following: boolean;
}

export interface DiscoverUsersResponseDto {
  items: DiscoverUserResult[];
  cursor: string | null;
  hasMore: boolean;
}

export interface DiscoverTagCategoryItemDto {
  value: string;
  count: number;
}

export interface DiscoverTagCategorySectionDto {
  category: string;
  items: DiscoverTagCategoryItemDto[];
}

export interface DiscoverTagCategoriesResponseDto {
  categories: DiscoverTagCategorySectionDto[];
}
