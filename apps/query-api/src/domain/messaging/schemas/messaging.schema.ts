import { z } from 'zod';
import {
  ACTIVITY_MAX_IMAGE_PHASHES,
  ACTIVITY_SOURCE_PLATFORMS,
} from '@opden-data-layer/core';

export const channelListQuerySchema = z.object({
  kind: z.enum(['direct', 'group', 'object']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ChannelListQuery = z.infer<typeof channelListQuerySchema>;

export const messageHistoryBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  for_context: z.boolean().optional(),
  include_duplicates: z.boolean().optional(),
});

export type MessageHistoryBody = z.infer<typeof messageHistoryBodySchema>;

export const activityDedupCheckBodySchema = z
  .object({
    source: z
      .object({
        platform: z.enum(ACTIVITY_SOURCE_PLATFORMS),
        id: z.string().min(1).max(256),
      })
      .optional(),
    original_text: z.string().max(65535).optional(),
    text_simhash: z.string().regex(/^[0-9a-f]{16}$/i).optional(),
    fp_v: z.number().int().min(1).optional(),
    image_phashes: z
      .array(z.string().regex(/^[0-9a-f]{16}$/i))
      .max(ACTIVITY_MAX_IMAGE_PHASHES)
      .optional(),
    original_created_at_unix: z.coerce.number().int().positive(),
  })
  .refine(
    (v) =>
      v.source != null ||
      v.original_text != null ||
      v.text_simhash != null ||
      (v.image_phashes?.length ?? 0) > 0,
    {
      message: 'Provide source, original_text, text_simhash, or image_phashes',
    },
  );

export type ActivityDedupCheckBody = z.infer<typeof activityDedupCheckBodySchema>;

export const markChannelReadBodySchema = z.object({
  last_read_at_unix: z.coerce.number().int(),
});

export type MarkChannelReadBody = z.infer<typeof markChannelReadBodySchema>;

export const validateMembersBodySchema = z.object({
  accounts: z.array(z.string().min(1).max(32)).max(100),
});

export type ValidateMembersBody = z.infer<typeof validateMembersBodySchema>;
