import { cache } from 'react';

import type { ObjectPageViewModel } from '@/modules/object';
import { fetchProjectedObjectWithCounts } from '@/modules/object/infrastructure/fetch-object-resolve.server';
import { projectedObjectWithCountsToPageModel } from '@/modules/object/infrastructure/projected-object-to-page-model';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { DEMO_OBJECT_IDS, mockModelFromDemoPreset } from './object-page-demo-data';

export const loadObjectPageModel = cache(
  async (objectId: string, locale: string): Promise<ObjectPageViewModel | null> => {
    const auth = createCookieAuthContextProvider();
    const user = await auth.getUser();
    const viewer = user?.username ?? null;

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
