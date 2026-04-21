import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Canonical link channel names (payload `type`); legacy Mongo keys are mapped only in migration. */
export const LINK_TYPES = [
  'facebook',
  'twitter',
  'youtube',
  'tiktok',
  'reddit',
  'linkedin',
  'telegram',
  'whatsapp',
  'pinterest',
  'twitch',
  'snapchat',
  'instagram',
  'github',
  'hive',
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

const linkTypeSchema = z.enum(
  LINK_TYPES as unknown as [LinkType, ...LinkType[]],
);

export const UPDATE_LINK: UpdateDefinition = {
  update_type: UPDATE_TYPES.LINK,
  description: 'Link or URL with optional metadata.',
  namespace: 'odl',
  localizable: true,
  semantic_key: 'link',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    type: linkTypeSchema,
    value: z.string().min(1),
  }),
};
