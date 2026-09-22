import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_STRING_MAX } from '../string-limits';
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

/** Bare social handle or account name. One leading `@` is stripped. */
const socialProfileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(UPDATE_STRING_MAX.NAME)
  .regex(/^@?[A-Za-z0-9+][A-Za-z0-9._+-]*$/)
  .transform((value) => (value.startsWith('@') ? value.slice(1) : value));

/** `urlStringSchema` allows any scheme; link values are http(s) only. */
const httpUrlSchema = urlStringSchema.refine(
  (value) => value.startsWith('http://') || value.startsWith('https://'),
);

export const UPDATE_LINK: UpdateDefinition = {
  update_type: UPDATE_TYPES.LINK,
  description: 'Social link: http(s) URL or profile name.',
  namespace: 'odl',
  localizable: true,
  semantic_key: 'link',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    type: linkTypeSchema,
    value: z.union([httpUrlSchema, socialProfileNameSchema]),
  }),
};
