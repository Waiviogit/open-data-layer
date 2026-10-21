import { z } from 'zod';
import { countryQueryField } from '../../../http/country-query.schema';

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const objectRefListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE)
    .default(DEFAULT_PAGE)
    .describe('Page size (max 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Opaque cursor from previous page (object_id of last item)'),
  country: countryQueryField,
});

export type ObjectRefListQuery = z.infer<typeof objectRefListQuerySchema>;

export type RefSummaryDto = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
  weight: number | null;
  addedAtUnix?: number;
  listItemsCount?: number;
  isFavorited?: boolean;
};

export type ObjectRefListResponseDto = {
  items: RefSummaryDto[];
  hasMore: boolean;
  cursor: string | null;
};
