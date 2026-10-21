import { z } from 'zod';
import { countryQueryField } from '../../http/country-query.schema';
import {
  DISCOVER_OBJECTS_DEFAULT_LIMIT,
  DISCOVER_OBJECTS_MAX_LIMIT,
  DISCOVER_USERS_DEFAULT_LIMIT,
  DISCOVER_USERS_MAX_LIMIT,
} from '../../constants/discover.constants';

export const discoverSortSchema = z.enum(['newest', 'oldest', 'rank']);
export type DiscoverSort = z.infer<typeof discoverSortSchema>;

function isValidDiscoverLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidDiscoverLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export const discoverBoxSchema = z
  .string()
  .transform((raw, ctx) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Empty box' });
      return z.NEVER;
    }
    const parts = trimmed.split(',');
    if (parts.length !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Box must have 4 coordinates' });
      return z.NEVER;
    }
    const swLng = Number(parts[0]);
    const swLat = Number(parts[1]);
    const neLng = Number(parts[2]);
    const neLat = Number(parts[3]);
    if (
      !isValidDiscoverLongitude(swLng) ||
      !isValidDiscoverLatitude(swLat) ||
      !isValidDiscoverLongitude(neLng) ||
      !isValidDiscoverLatitude(neLat)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid box coordinates' });
      return z.NEVER;
    }
    if (swLat > neLat) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Inverted latitude bounds' });
      return z.NEVER;
    }
    return { swLng, swLat, neLng, neLat };
  })
  .pipe(
    z.object({
      swLng: z.number(),
      swLat: z.number(),
      neLng: z.number(),
      neLat: z.number(),
    }),
  );

export type DiscoverBox = z.infer<typeof discoverBoxSchema>;

export const discoverObjectsQuerySchema = z.object({
  object_type: z
    .string()
    .min(1)
    .optional()
    .describe('Registry object type filter (e.g. book, product)'),
  q: z.string().max(100).optional().describe('Optional text search within discover scope'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Tag filters combined with AND semantics')
    .transform((v) => {
      if (v == null) {
        return [] as string[];
      }
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((s) => s.trim()).filter((s) => s.length > 0);
    }),
  sort: discoverSortSchema
    .default('rank')
    .describe('Sort order: newest, oldest, or rank'),
  box: discoverBoxSchema
    .optional()
    .describe('Map bounding box as swLng,swLat,neLng,neLat'),
  cursor: z.string().optional().describe('Opaque pagination cursor from prior response'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DISCOVER_OBJECTS_MAX_LIMIT)
    .default(DISCOVER_OBJECTS_DEFAULT_LIMIT)
    .describe('Page size'),
  country: countryQueryField,
});
export type DiscoverObjectsQuery = z.infer<typeof discoverObjectsQuerySchema>;

export const discoverUsersQuerySchema = z.object({
  q: z.string().max(100).optional().describe('Optional account name search'),
  cursor: z.string().optional().describe('Opaque pagination cursor'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DISCOVER_USERS_MAX_LIMIT)
    .default(DISCOVER_USERS_DEFAULT_LIMIT)
    .describe('Page size'),
});
export type DiscoverUsersQuery = z.infer<typeof discoverUsersQuerySchema>;

export const discoverTagCategoriesQuerySchema = z.object({
  object_type: z.string().min(1).describe('Object type for tag facet listing'),
  q: z.string().max(100).optional().describe('Optional text filter'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Selected tags (AND) to narrow facets')
    .transform((v) => {
      if (v == null) {
        return [] as string[];
      }
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((s) => s.trim()).filter((s) => s.length > 0);
    }),
  box: discoverBoxSchema
    .optional()
    .describe('Map bounding box as swLng,swLat,neLng,neLat'),
});
export type DiscoverTagCategoriesQuery = z.infer<typeof discoverTagCategoriesQuerySchema>;
