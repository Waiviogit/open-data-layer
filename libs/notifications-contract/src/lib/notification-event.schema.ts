import { z } from 'zod';
import type { NotificationEventType } from './notification-payloads';
import { NOTIFICATION_EVENT_TYPES } from './notification-payloads';

const envelopeSchema = {
  occurredAt: z.string().min(1),
  blockNum: z.number().int().nonnegative(),
  trxId: z.string().nullable(),
  objectId: z.string().nullable(),
  actor: z.string().nullable(),
};

const replyPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  parentAuthor: z.string(),
  parentPermlink: z.string(),
  isRootPost: z.boolean(),
  replyToPermlink: z.string().nullable().optional(),
  isReplyToComment: z.boolean().optional(),
});

const mentionPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  isRootPost: z.boolean(),
  mentioned: z.string(),
});

const postRefPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  title: z.string(),
});

const myCommentPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  parentAuthor: z.string(),
});

const votePayload = z.object({
  voter: z.string(),
  author: z.string(),
  permlink: z.string(),
  weight: z.number(),
});

const voteLikePayload = votePayload.extend({
  title: z.string().nullable().optional().default(null),
  likesCount: z.number().int().nonnegative().optional().default(0),
});

const myVotePayload = z.object({
  voter: z.string(),
  author: z.string(),
  permlink: z.string(),
  title: z.string().nullable(),
});

const reblogPayload = z.object({
  account: z.string(),
  author: z.string(),
  permlink: z.string(),
  title: z.string().nullable(),
});

const followPayload = z.object({
  following: z.string(),
  action: z.enum(['follow', 'unfollow']),
});

const bellObjectPostPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  title: z.string(),
  wobjectPermlink: z.string(),
  wobjectName: z.string(),
});

const bellThreadPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  authorPermlink: z.string(),
});

const threadAuthorFollowerPayload = z.object({
  author: z.string(),
  permlink: z.string(),
  hashtags: z.array(z.string()),
  mentions: z.array(z.string()),
});

const transferPayload = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  symbol: z.string(),
  memo: z.string().nullable(),
});

const powerUpPayload = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string(),
});

const powerDownPayload = z.object({
  account: z.string(),
  amount: z.string(),
});

const claimRewardPayload = z.object({
  rewardHive: z.string(),
  rewardHbd: z.string(),
  rewardHp: z.string(),
});

const witnessVotePayload = z.object({
  witness: z.string(),
  approve: z.boolean(),
});

const fillOrderPayload = z.object({
  currentPays: z.string(),
  openPays: z.string(),
  exchanger: z.string(),
  orderId: z.number(),
});

const withdrawRoutePayload = z.object({
  fromAccount: z.string(),
  toAccount: z.string(),
  percent: z.number(),
  autoVest: z.boolean(),
});

const changeRecoveryPayload = z.object({
  account: z.string(),
  newRecoveryAccount: z.string(),
});

const changePasswordPayload = z.object({
  account: z.string(),
});

const hpDelegationPayload = z.object({
  delegator: z.string(),
  delegatee: z.string(),
  amount: z.string(),
});

const engineTransferPayload = transferPayload;

const engineSwapPayload = z.object({
  account: z.string(),
  symbolOut: z.string(),
  symbolIn: z.string(),
  symbolOutQuantity: z.string(),
  symbolInQuantity: z.string(),
});

const engineAmountPayload = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  symbol: z.string(),
});

const engineAccountAmountPayload = z.object({
  account: z.string(),
  amount: z.string(),
  symbol: z.string(),
});

const objectUpdatePayload = z.object({
  updateId: z.string(),
  updateType: z.string(),
  objectName: z.string().nullable(),
  authorPermlink: z.string().nullable(),
});

const objectUpdateRejectPayload = objectUpdatePayload.extend({
  voter: z.string(),
});

const objectStatusChangePayload = z.object({
  objectName: z.string().nullable(),
  authorPermlink: z.string(),
  oldStatus: z.string(),
  newStatus: z.string(),
  account: z.string(),
});

const updateVoteCastPayload = z.object({
  updateId: z.string(),
  vote: z.string(),
  updateType: z.string().optional().default('update'),
  objectName: z.string().nullable().optional().default(null),
  authorPermlink: z.string().optional().default(''),
});

const objectCreatedPayload = z.object({
  updateId: z.string(),
  updateType: z.string(),
});

const batchImportPayload = z.object({
  cid: z.string(),
});

const messageDirectPayload = z.object({
  channelId: z.string(),
  messageId: z.string(),
  author: z.string(),
  encrypted: z.boolean(),
});

const messageGroupPayload = messageDirectPayload.extend({
  channelTitle: z.string().nullable(),
});

const bellObjectMessagePayload = messageDirectPayload.extend({
  objectName: z.string().nullable().optional(),
});

const oblOfferKind = z.enum(['offer', 'request']);

const oblOfferPublishPayload = z.object({
  offerId: z.string(),
  version: z.number().int().positive(),
  kind: oblOfferKind,
  name: z.string(),
  author: z.string(),
  arbiter: z.string().nullable(),
});

const oblOfferRetirePayload = z.object({
  offerId: z.string(),
  version: z.number().int().positive(),
  kind: oblOfferKind,
  name: z.string(),
  author: z.string(),
});

const oblContractSignPayload = z.object({
  contractId: z.string(),
  offerId: z.string(),
  provider: z.string(),
  client: z.string(),
  signer: z.string(),
});

const oblServiceOrderCreatePayload = z.object({
  serviceOrderId: z.string(),
  contractId: z.string(),
  creator: z.string(),
  provider: z.string(),
  client: z.string(),
});

const oblReportCreatePayload = z.object({
  reportId: z.string(),
  contractId: z.string(),
  author: z.string(),
  provider: z.string(),
  client: z.string(),
});

const oblInvoiceIssuePayload = z.object({
  invoiceId: z.string(),
  issuer: z.string(),
  debtor: z.string(),
  beneficiaries: z.array(z.string()),
  amountUsd: z.string(),
  contractId: z.string().nullable(),
});

const oblPaymentPayload = z.object({
  paymentId: z.string(),
  payer: z.string(),
  receiver: z.string(),
  amountUsd: z.string(),
  state: z.string(),
});

const oblDisputeOpenPayload = z.object({
  disputeId: z.string(),
  invoiceId: z.string(),
  disputant: z.string(),
  resolver: z.string().nullable(),
  debtor: z.string(),
  beneficiaries: z.array(z.string()),
  amountUsd: z.string(),
});

const oblDisputeResolvePayload = oblDisputeOpenPayload.extend({
  resolver: z.string(),
});

const emptyPayload = z.object({}).strict();

const notificationEventVariants = [
  z.object({ type: z.literal('reply'), ...envelopeSchema, payload: replyPayload }),
  z.object({ type: z.literal('mention'), ...envelopeSchema, payload: mentionPayload }),
  z.object({ type: z.literal('my_post'), ...envelopeSchema, payload: postRefPayload }),
  z.object({
    type: z.literal('my_comment'),
    ...envelopeSchema,
    payload: myCommentPayload,
  }),
  z.object({ type: z.literal('vote_like'), ...envelopeSchema, payload: voteLikePayload }),
  z.object({
    type: z.literal('vote_downvote'),
    ...envelopeSchema,
    payload: votePayload,
  }),
  z.object({ type: z.literal('my_vote'), ...envelopeSchema, payload: myVotePayload }),
  z.object({ type: z.literal('reblog'), ...envelopeSchema, payload: reblogPayload }),
  z.object({ type: z.literal('follow'), ...envelopeSchema, payload: followPayload }),
  z.object({ type: z.literal('bell_post'), ...envelopeSchema, payload: postRefPayload }),
  z.object({
    type: z.literal('bell_reblog'),
    ...envelopeSchema,
    payload: reblogPayload,
  }),
  z.object({
    type: z.literal('bell_follow'),
    ...envelopeSchema,
    payload: z.object({ follower: z.string(), following: z.string() }),
  }),
  z.object({
    type: z.literal('bell_object_post'),
    ...envelopeSchema,
    payload: bellObjectPostPayload,
  }),
  z.object({
    type: z.literal('bell_thread'),
    ...envelopeSchema,
    payload: bellThreadPayload,
  }),
  z.object({
    type: z.literal('thread_author_follower'),
    ...envelopeSchema,
    payload: threadAuthorFollowerPayload,
  }),
  z.object({
    type: z.literal('transfer_in'),
    ...envelopeSchema,
    payload: transferPayload,
  }),
  z.object({
    type: z.literal('transfer_out'),
    ...envelopeSchema,
    payload: transferPayload,
  }),
  z.object({
    type: z.literal('transfer_from_savings'),
    ...envelopeSchema,
    payload: transferPayload,
  }),
  z.object({ type: z.literal('power_up'), ...envelopeSchema, payload: powerUpPayload }),
  z.object({
    type: z.literal('power_down'),
    ...envelopeSchema,
    payload: powerDownPayload,
  }),
  z.object({
    type: z.literal('claim_reward'),
    ...envelopeSchema,
    payload: claimRewardPayload,
  }),
  z.object({
    type: z.literal('witness_vote'),
    ...envelopeSchema,
    payload: witnessVotePayload,
  }),
  z.object({
    type: z.literal('fill_order'),
    ...envelopeSchema,
    payload: fillOrderPayload,
  }),
  z.object({
    type: z.literal('withdraw_route'),
    ...envelopeSchema,
    payload: withdrawRoutePayload,
  }),
  z.object({
    type: z.literal('change_recovery_account'),
    ...envelopeSchema,
    payload: changeRecoveryPayload,
  }),
  z.object({
    type: z.literal('change_password'),
    ...envelopeSchema,
    payload: changePasswordPayload,
  }),
  z.object({
    type: z.literal('hp_delegation'),
    ...envelopeSchema,
    payload: hpDelegationPayload,
  }),
  z.object({
    type: z.literal('engine_transfer'),
    ...envelopeSchema,
    payload: engineTransferPayload,
  }),
  z.object({
    type: z.literal('engine_transfer_out'),
    ...envelopeSchema,
    payload: engineTransferPayload,
  }),
  z.object({
    type: z.literal('engine_swap'),
    ...envelopeSchema,
    payload: engineSwapPayload,
  }),
  z.object({
    type: z.literal('engine_stake'),
    ...envelopeSchema,
    payload: engineAmountPayload,
  }),
  z.object({
    type: z.literal('engine_unstake'),
    ...envelopeSchema,
    payload: engineAccountAmountPayload,
  }),
  z.object({
    type: z.literal('engine_cancel_unstake'),
    ...envelopeSchema,
    payload: engineAccountAmountPayload,
  }),
  z.object({
    type: z.literal('engine_delegate'),
    ...envelopeSchema,
    payload: engineAmountPayload,
  }),
  z.object({
    type: z.literal('engine_undelegate'),
    ...envelopeSchema,
    payload: engineAmountPayload,
  }),
  z.object({
    type: z.literal('object_update'),
    ...envelopeSchema,
    payload: objectUpdatePayload,
  }),
  z.object({
    type: z.literal('object_update_reject'),
    ...envelopeSchema,
    payload: objectUpdateRejectPayload,
  }),
  z.object({
    type: z.literal('object_status_change'),
    ...envelopeSchema,
    payload: objectStatusChangePayload,
  }),
  z.object({
    type: z.literal('update_vote_cast'),
    ...envelopeSchema,
    payload: updateVoteCastPayload,
  }),
  z.object({
    type: z.literal('object_created'),
    ...envelopeSchema,
    payload: objectCreatedPayload,
  }),
  z.object({
    type: z.literal('batch_import_completed'),
    ...envelopeSchema,
    payload: batchImportPayload,
  }),
  z.object({
    type: z.literal('message_direct'),
    ...envelopeSchema,
    payload: messageDirectPayload,
  }),
  z.object({
    type: z.literal('message_group'),
    ...envelopeSchema,
    payload: messageGroupPayload,
  }),
  z.object({
    type: z.literal('bell_object_message'),
    ...envelopeSchema,
    payload: bellObjectMessagePayload,
  }),
  z.object({
    type: z.literal('obl_offer_publish'),
    ...envelopeSchema,
    payload: oblOfferPublishPayload,
  }),
  z.object({
    type: z.literal('obl_offer_update'),
    ...envelopeSchema,
    payload: oblOfferPublishPayload,
  }),
  z.object({
    type: z.literal('obl_offer_retire'),
    ...envelopeSchema,
    payload: oblOfferRetirePayload,
  }),
  z.object({
    type: z.literal('obl_contract_sign'),
    ...envelopeSchema,
    payload: oblContractSignPayload,
  }),
  z.object({
    type: z.literal('obl_service_order_create'),
    ...envelopeSchema,
    payload: oblServiceOrderCreatePayload,
  }),
  z.object({
    type: z.literal('obl_report_create'),
    ...envelopeSchema,
    payload: oblReportCreatePayload,
  }),
  z.object({
    type: z.literal('obl_invoice_issue'),
    ...envelopeSchema,
    payload: oblInvoiceIssuePayload,
  }),
  z.object({
    type: z.literal('obl_payment_declare'),
    ...envelopeSchema,
    payload: oblPaymentPayload,
  }),
  z.object({
    type: z.literal('obl_payment_confirm'),
    ...envelopeSchema,
    payload: oblPaymentPayload,
  }),
  z.object({
    type: z.literal('obl_dispute_open'),
    ...envelopeSchema,
    payload: oblDisputeOpenPayload,
  }),
  z.object({
    type: z.literal('obl_dispute_resolve'),
    ...envelopeSchema,
    payload: oblDisputeResolvePayload,
  }),
  z.object({
    type: z.literal('trx_processed'),
    ...envelopeSchema,
    payload: emptyPayload,
  }),
] as const;

export const notificationEventSchema = z.discriminatedUnion(
  'type',
  notificationEventVariants,
);

export type ParsedNotificationEvent = z.infer<typeof notificationEventSchema>;

/** Runtime list mirrored from {@link NOTIFICATION_EVENT_TYPES}. */
export const NOTIFICATION_EVENT_TYPE_LITERALS: readonly NotificationEventType[] =
  NOTIFICATION_EVENT_TYPES;
