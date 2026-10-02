import { SUPPORTED_CURRENCIES } from '@opden-data-layer/core';
import { z } from 'zod';
import { activityAuthorsFilterFields } from '../../governance/activity-authors-filter.schema';

export const objectThreadsFeedBodySchema = z.preprocess(
  (data) => (data === undefined || data === null ? {} : data),
  z.object({
    limit: z.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    sort: z.enum(['latest', 'oldest']).optional().default('latest'),
    currency: z.enum(SUPPORTED_CURRENCIES).optional().default('USD'),
    ...activityAuthorsFilterFields,
  }),
);

export type ObjectThreadsFeedBody = z.infer<typeof objectThreadsFeedBodySchema>;
