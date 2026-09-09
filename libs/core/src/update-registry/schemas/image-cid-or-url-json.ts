import { z } from 'zod';
import { cidSchema } from './cid-schema';
import { urlStringSchema } from './string-schemas';

/** Exactly one of `cid` (IPFS CID) or `url` — never both, never neither. */
export const imageCidOrUrlJsonSchema = z
  .object({
    cid: cidSchema.optional(),
    url: urlStringSchema.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.cid) !== Boolean(v.url), {
    message: 'Exactly one of cid or url must be set',
  });

export type ImageCidOrUrlJson = z.infer<typeof imageCidOrUrlJsonSchema>;
