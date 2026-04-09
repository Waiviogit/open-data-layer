import { z } from 'zod';
import {
  DRAFT_LIST_DEFAULT_LIMIT,
  DRAFT_LIST_MAX_LIMIT,
} from './drafts.constants';

const jsonLike = z.unknown();

export const getDraftsQuerySchema = z
  .object({
    draftId: z.string().min(1).optional(),
    permlink: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(DRAFT_LIST_MAX_LIMIT).optional(),
    cursor: z.string().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasDraft = Boolean(val.draftId);
    const hasPerm = Boolean(val.permlink);
    if (hasDraft && hasPerm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specify only one of draftId or permlink',
      });
    }
    const isList = !hasDraft && !hasPerm;
    if (!isList && (val.limit !== undefined || val.cursor !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'limit and cursor are only valid for list requests (omit draftId and permlink)',
      });
    }
  });

export type GetDraftsQuery = z.infer<typeof getDraftsQuerySchema>;

export const mutateDraftQuerySchema = z
  .object({
    draftId: z.string().min(1).optional(),
    permlink: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasDraft = Boolean(val.draftId);
    const hasPerm = Boolean(val.permlink);
    if (hasDraft === hasPerm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of draftId or permlink',
      });
    }
  });

export type MutateDraftQuery = z.infer<typeof mutateDraftQuerySchema>;

export const createUserPostDraftBodySchema = z
  .object({
    title: z.string().optional().default(''),
    body: z.string().optional().default(''),
    jsonMetadata: jsonLike.optional(),
    parentAuthor: z.string().optional().default(''),
    parentPermlink: z.string().optional().default(''),
    permlink: z.string().nullable().optional(),
    beneficiaries: jsonLike.optional(),
  })
  .strict();

export type CreateUserPostDraftBody = z.infer<
  typeof createUserPostDraftBodySchema
>;

export const patchUserPostDraftBodySchema = z
  .object({
    title: z.string().optional(),
    body: z.string().optional(),
    jsonMetadata: jsonLike.optional(),
    parentAuthor: z.string().optional(),
    parentPermlink: z.string().optional(),
    permlink: z.string().nullable().optional(),
    beneficiaries: jsonLike.optional(),
  })
  .strict();

export type PatchUserPostDraftBody = z.infer<
  typeof patchUserPostDraftBodySchema
>;

export const bulkDeleteUserPostDraftsBodySchema = z
  .object({
    draftIds: z
      .array(z.string().uuid())
      .min(1)
      .max(DRAFT_LIST_MAX_LIMIT),
  })
  .strict();

export type BulkDeleteUserPostDraftsBody = z.infer<
  typeof bulkDeleteUserPostDraftsBodySchema
>;

export function parseListLimit(raw: GetDraftsQuery): number {
  return raw.limit ?? DRAFT_LIST_DEFAULT_LIMIT;
}
