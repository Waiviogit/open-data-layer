import { z } from 'zod';

export const resolveObjectBodySchema = z.object({
  object_id: z.string().min(1, 'object_id is required'),
  update_types: z.array(z.string()).min(1, 'update_types must include at least one type'),
  include_rejected: z.boolean().optional(),
});

export type ResolveObjectBody = z.infer<typeof resolveObjectBodySchema>;
