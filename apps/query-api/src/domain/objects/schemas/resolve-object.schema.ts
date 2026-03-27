import { z } from 'zod';

export const resolveObjectBodySchema = z.object({
  object_id: z.string().min(1, 'object_id is required'),
  /** When omitted or empty, all update types present on the object are resolved. */
  update_types: z.array(z.string()).default([]),
  include_rejected: z.boolean().optional(),
});

export type ResolveObjectBody = z.infer<typeof resolveObjectBodySchema>;
