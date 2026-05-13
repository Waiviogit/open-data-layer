import type { ProjectedObject } from '../object-projection/projected-object.types';

export type ProjectedObjectWithCounts = ProjectedObject & {
  followers_count: number;
  updates_count: number;
};
