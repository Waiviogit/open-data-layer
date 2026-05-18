/** Response DTO: predictive search (`GET /query/v1/search`). */
export interface SearchObjectResult {
  object_id: string;
  /** From `objects_core.object_type` after projection. */
  object_type: string;
  /** Winning `name` update value. */
  name: string | null;
  /** Projected image display URL. */
  image_url: string | null;
  /** Parent ref display name when `parent` resolves. */
  parent_name: string | null;
}

export interface SearchUserResult {
  name: string;
  profile_image: string | null;
  reputation: number;
  followers_count: number;
  is_following: boolean;
}

export interface SearchResponseDto {
  objects: SearchObjectResult[];
  users: SearchUserResult[];
  /** Count of returned objects grouped by `object_type`. */
  type_counts: Record<string, number>;
  total_users: number;
}
