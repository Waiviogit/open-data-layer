import type { ProjectedObject } from '../object-projection/projected-object.types';

export interface PaginatedProjectedObjects {
  items: ProjectedObject[];
  total: number;
  hasMore: boolean;
}
