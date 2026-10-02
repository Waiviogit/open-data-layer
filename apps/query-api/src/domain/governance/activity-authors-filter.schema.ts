import { z } from 'zod';

export const activityAuthorsFilterFields = {
  authors_only: z
    .boolean()
    .optional()
    .describe(
      'When true, return only activity whose author is in the governance `authors` list ' +
        '(merged platform governance + governance_object_id). Empty list returns an empty page. ' +
        'Default false: no author allowlist.',
    ),
  authors_governance_object_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Optional second governance object id whose `authors` are unioned into the allowlist. ' +
        'Ignored unless authors_only is true. Does not change mutes (use governance_object_id for that).',
    ),
};

export type ActivityAuthorsFilterBody = {
  authors_only?: boolean;
  authors_governance_object_id?: string;
};
