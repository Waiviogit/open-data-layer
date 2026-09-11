import { buildCustomJsonOp } from './operation-builders';
import type { CustomJsonOp } from './hive-operations';

type OslEnvelopeAction =
  | 'hive_engine_deposit'
  | 'update_user_notification_settings'
  | 'update_user_metadata'
  | 'channel_create'
  | 'channel_alias_register'
  | 'channel_member_add'
  | 'channel_member_remove'
  | 'channel_leave'
  | 'channel_update'
  | 'message_create'
  | 'message_update'
  | 'message_delete'
  | 'message_context_exclude';

export type BuildOslEnvelopeOpInput = {
  readonly id: string;
  readonly action: OslEnvelopeAction;
  readonly payload: Record<string, unknown>;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

export type BuildOslHiveEngineDepositOpInput = {
  readonly id: string;
  readonly account: string;
  readonly payload: {
    readonly author: string;
    readonly destination: string;
    readonly symbol_in: string;
    readonly symbol_out: string;
    readonly pair: string;
    readonly ex_rate: number;
    readonly memo?: string;
    readonly deposit_account?: string;
    readonly address?: string;
  };
};

export function buildOslEnvelopeOp(input: BuildOslEnvelopeOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: input.action,
        v: 1,
        payload: input.payload,
      },
    ],
  };

  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [],
    id: input.id,
    json: JSON.stringify(envelope),
  });
}

export function buildOslHiveEngineDepositOp(
  input: BuildOslHiveEngineDepositOpInput,
): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'hive_engine_deposit',
    payload: input.payload,
    required_posting_auths: [input.account],
  });
}

export type UpdateUserNotificationSettingsPayload = {
  readonly follow: boolean;
  readonly reblog: boolean;
  readonly reply: boolean;
  readonly mention: boolean;
  readonly vote: boolean;
  readonly downvote: boolean;
  readonly claimed_object_updates: boolean;
  readonly group_id_control: boolean;
  readonly followed_user_threads: boolean;
  readonly transfer: boolean;
  readonly fill_order: boolean;
  readonly power_up: boolean;
  readonly claim_reward: boolean;
  readonly witness_vote: boolean;
  readonly my_post: boolean;
  readonly my_comment: boolean;
  readonly my_like: boolean;
  readonly minimal_transfer: number;
  readonly messages: boolean;
  readonly obl: boolean;
};

export type BuildOslUpdateUserNotificationSettingsOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly settings: UpdateUserNotificationSettingsPayload;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `update_user_notification_settings` OSL event.
 */
export function buildOslUpdateUserNotificationSettingsOp(
  input: BuildOslUpdateUserNotificationSettingsOpInput,
): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'update_user_notification_settings',
    payload: input.settings,
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [input.creator],
  });
}

export type UpdateUserMetadataPayload = {
  readonly notifications_last_timestamp: number;
  readonly exit_page_setting: boolean;
  readonly locale: string;
  readonly post_locales: unknown;
  readonly nightmode: boolean;
  readonly reward_setting: 'HP' | '50' | 'HIVE';
  readonly rewrite_links: boolean;
  readonly show_nsfw_posts: boolean;
  readonly upvote_setting: boolean;
  readonly vote_percent: number;
  readonly voting_power: boolean;
  readonly currency: string | null;
  readonly hide_linked_objects: boolean;
  readonly hide_recipe_objects: boolean;
  readonly hide_favorite_objects?: boolean;
};

export type BuildOslUpdateUserMetadataOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly metadata: UpdateUserMetadataPayload;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `update_user_metadata` OSL event.
 */
export function buildOslUpdateUserMetadataOp(
  input: BuildOslUpdateUserMetadataOpInput,
): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'update_user_metadata',
    payload: input.metadata,
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [input.creator],
  });
}

export type BuildOslMessageCreateOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslMessageCreateOp(input: BuildOslMessageCreateOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'message_create',
    payload: input.payload,
    required_posting_auths: [input.creator],
  });
}

export type BuildOslMessageUpdateOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslMessageUpdateOp(input: BuildOslMessageUpdateOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'message_update',
    payload: input.payload,
    required_posting_auths: [input.creator],
  });
}

export type BuildOslMessageDeleteOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslMessageDeleteOp(input: BuildOslMessageDeleteOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'message_delete',
    payload: input.payload,
    required_posting_auths: [input.creator],
  });
}

export type BuildOslChannelCreateOpInput = {
  readonly id: string;
  readonly creator: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslChannelCreateOp(input: BuildOslChannelCreateOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'channel_create',
    payload: input.payload,
    required_posting_auths: [input.creator],
  });
}

export type BuildOslChannelLeaveOpInput = {
  readonly id: string;
  readonly leaver: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslChannelLeaveOp(input: BuildOslChannelLeaveOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'channel_leave',
    payload: input.payload,
    required_posting_auths: [input.leaver],
  });
}

export type BuildOslChannelUpdateOpInput = {
  readonly id: string;
  readonly admin: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslChannelUpdateOp(input: BuildOslChannelUpdateOpInput): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'channel_update',
    payload: input.payload,
    required_posting_auths: [input.admin],
  });
}

export type BuildOslChannelMemberAddOpInput = {
  readonly id: string;
  readonly admin: string;
  readonly payload: Record<string, unknown>;
};

export function buildOslChannelMemberAddOp(
  input: BuildOslChannelMemberAddOpInput,
): CustomJsonOp {
  return buildOslEnvelopeOp({
    id: input.id,
    action: 'channel_member_add',
    payload: input.payload,
    required_posting_auths: [input.admin],
  });
}
