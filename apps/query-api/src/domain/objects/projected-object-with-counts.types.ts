import type { ProjectedObject } from '../object-projection/projected-object.types';

export type ProjectedObjectWithCounts = ProjectedObject & {
  followers_count: number;
  updates_count: number;
  administrative_count: number;
  ownership_count: number;
  is_following: boolean;
  viewer_bell: boolean;
  update_type_counts: Record<string, number>;
};
