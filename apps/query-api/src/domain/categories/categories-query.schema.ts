import { z } from 'zod';

const qsArray = z.preprocess((v: unknown) => {
  if (v === undefined || v === '') {
    return [];
  }
  if (Array.isArray(v)) {
    return v.map((x) => String(x));
  }
  return [String(v)];
}, z.array(z.string()));

const typesArray = z.preprocess((v: unknown) => {
  if (v === undefined || v === '') {
    return ['book', 'product'];
  }
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  return [String(v).trim()].filter(Boolean);
}, z.array(z.string()).min(1));

export { qsArray, typesArray };

export const userCategoriesQuerySchema = z.object({
  /** Which `object_type` bucket to load (must match precomputed `scope_key`). */
  types: typesArray,
  /** Parent department name for level ≥ 2 (omit for root). */
  name: z.string().optional(),
  /** Ancestors before `name` when drilling down. */
  path: qsArray,
  /** Names excluded from siblings (client hint). */
  excluded: qsArray,
});

export type UserCategoriesQuery = z.infer<typeof userCategoriesQuerySchema>;

export type UserCategoriesResponse = {
  items: Array<{ name: string; objects_count: number; has_children: boolean }>;
  uncategorized_count: number;
  show_other: boolean;
};
