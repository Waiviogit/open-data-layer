import { z } from 'zod';

import { projectedObjectViewSchema } from '@/modules/feed/application/dto/feed-story.dto';

export const shopObjectsPageSchema = z.object({
  items: z.array(projectedObjectViewSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ShopObjectsPage = z.infer<typeof shopObjectsPageSchema>;

export const shopSectionViewSchema = z.object({
  categoryName: z.string(),
  items: z.array(projectedObjectViewSchema),
  totalObjects: z.number(),
});

export type ShopSectionView = z.infer<typeof shopSectionViewSchema>;

export const shopSectionsPageSchema = z.object({
  sections: z.array(shopSectionViewSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ShopSectionsPage = z.infer<typeof shopSectionsPageSchema>;
