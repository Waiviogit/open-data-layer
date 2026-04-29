import { z } from 'zod';
import { qsArray, typesArray } from '../categories/categories-query.schema';

export const shopObjectsQuerySchema = z.object({
  types: typesArray,
  /** AND filter on category_names; [] = all in scope (ignored when `uncategorizedOnly`). */
  categoryPath: qsArray,
  /**
   * When true, only objects with no category assignment (`category_names` null or empty).
   */
  uncategorizedOnly: z.preprocess(
    (v) => v === 'true' || v === true || v === '1' || v === 1,
    z.boolean().optional().default(false),
  ),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type ShopObjectsQuery = z.infer<typeof shopObjectsQuerySchema>;

export const shopSectionsQuerySchema = z.object({
  types: typesArray,
  /** Parent department for drill-down (omit at root). */
  name: z.string().optional(),
  /** Ancestors before `name`. */
  path: qsArray,
  /** Opaque: last category `name` from the previous page (matches nav ordering). */
  cursor: z.string().optional(),
  sectionLimit: z.coerce.number().int().min(1).max(10).default(3),
});

export type ShopSectionsQuery = z.infer<typeof shopSectionsQuerySchema>;
