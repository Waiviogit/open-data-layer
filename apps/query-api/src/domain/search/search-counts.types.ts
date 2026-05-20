/** Response DTO: global search counts (`GET /query/v1/search/counts`). */
export interface SearchCountsResponseDto {
  /** Unique active objects per `object_type` in DB for query `q` (meta_group deduped). */
  type_counts: Record<string, number>;
  /** Total users matching the name prefix for query `q`. */
  total_users: number;
}
