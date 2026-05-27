import { cache } from 'react';

import type { ObjectPageViewModel } from '@/modules/object';
import { fetchProjectedObjectWithCounts } from '@/modules/object/infrastructure/fetch-object-resolve.server';
import { projectedObjectWithCountsToPageModel } from '@/modules/object/infrastructure/projected-object-to-page-model';
import { DEMO_OBJECT_IDS, mockModelFromDemoPreset } from './object-page-demo-data';

export const loadObjectPageModel = cache(
  async (
    objectId: string,
    locale: string,
    viewer: string | null,
  ): Promise<ObjectPageViewModel | null> => {
    const api = await fetchProjectedObjectWithCounts(objectId, { locale, viewer });
    if (api) {
      return projectedObjectWithCountsToPageModel(api);
    }

    if (DEMO_OBJECT_IDS.has(objectId)) {
      return mockModelFromDemoPreset(objectId);
    }

    return null;
  },
);
