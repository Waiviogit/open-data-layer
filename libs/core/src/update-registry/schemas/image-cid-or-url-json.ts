import { z } from 'zod';
import { cidSchema } from './cid-schema';

/** Exactly one of `cid` (IPFS CID) or `url` — never both, never neither. */
export const imageCidOrUrlJsonSchema = z
  .object({
    cid: cidSchema.optional(),
    url: z.url().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.cid) !== Boolean(v.url), {
    message: 'Exactly one of cid or url must be set',
  });

export type ImageCidOrUrlJson = z.infer<typeof imageCidOrUrlJsonSchema>;
