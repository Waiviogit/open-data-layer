import type { ObjectUpdatesFeedPageView } from './application/dto/object-updates-feed.dto';
import type { ObjectUpdatesUrlFilters } from './application/parse-object-updates-search-params';
import type { UpdateTypeOption } from './presentation/components/update-filter-bar';

/** Server-built props for embedding the updates feed on the object profile (client-safe type). */
export type ObjectEmbeddedUpdatesFeedModel = {
  initialPage: ObjectUpdatesFeedPageView;
  filters: ObjectUpdatesUrlFilters;
  typeOptions: UpdateTypeOption[];
  showLocaleFilter: boolean;
  localizableTypes: string[];
};
