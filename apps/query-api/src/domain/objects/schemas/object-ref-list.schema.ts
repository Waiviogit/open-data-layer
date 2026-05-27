import { z } from 'zod';

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const objectRefListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE).default(DEFAULT_PAGE),
  cursor: z.string().optional(),
});

export type ObjectRefListQuery = z.infer<typeof objectRefListQuerySchema>;

export type RefSummaryDto = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
  weight: number | null;
  addedAtUnix?: number;
  listItemsCount?: number;
  hasAdministrativeAuthority?: boolean;
};

export type ObjectRefListResponseDto = {
  items: RefSummaryDto[];
  hasMore: boolean;
  cursor: string | null;
};
