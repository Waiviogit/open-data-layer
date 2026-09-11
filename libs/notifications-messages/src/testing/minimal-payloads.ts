import type { NOTIFICATION_EVENT_TYPES } from '@opden-data-layer/notifications-contract';

export function minimalNotificationEventPayload(
  type: (typeof NOTIFICATION_EVENT_TYPES)[number],
): Record<string, unknown> {
  switch (type) {
    case 'reply':
      return {
        author: 'a',
        permlink: 'p',
        parentAuthor: 'b',
        parentPermlink: 'pp',
        isRootPost: false,
      };
    case 'mention':
      return { author: 'a', permlink: 'p', isRootPost: true, mentioned: 'bob' };
    case 'my_post':
      return { author: 'a', permlink: 'p', title: 't' };
    case 'my_comment':
      return { author: 'a', permlink: 'p', parentAuthor: 'b' };
    case 'vote_like':
      return {
        voter: 'v',
        author: 'a',
        permlink: 'p',
        weight: 1,
        title: 't',
        likesCount: 0,
      };
    case 'vote_downvote':
      return { voter: 'v', author: 'a', permlink: 'p', weight: 1 };
    case 'my_vote':
      return { voter: 'v', author: 'a', permlink: 'p', title: null };
    case 'reblog':
    case 'bell_reblog':
      return { account: 'a', author: 'b', permlink: 'p', title: null };
    case 'follow':
      return { following: 'b', action: 'follow' };
    case 'bell_post':
      return { author: 'a', permlink: 'p', title: 't' };
    case 'bell_follow':
      return { follower: 'a', following: 'b' };
    case 'bell_object_post':
      return {
        author: 'a',
        permlink: 'p',
        title: 't',
        wobjectPermlink: 'w',
        wobjectName: 'W',
      };
    case 'bell_thread':
      return { author: 'a', permlink: 'p', authorPermlink: 'w' };
    case 'thread_author_follower':
      return { author: 'a', permlink: 'p', hashtags: [], mentions: [] };
    case 'transfer_in':
    case 'transfer_out':
    case 'transfer_from_savings':
      return {
        from: 'a',
        to: 'b',
        amount: '1',
        symbol: 'HIVE',
        memo: null,
      };
    case 'power_up':
      return { from: 'a', to: 'b', amount: '1' };
    case 'power_down':
      return { account: 'a', amount: '1' };
    case 'claim_reward':
      return { rewardHive: '0 HIVE', rewardHbd: '0 HBD', rewardHp: '0 HP' };
    case 'witness_vote':
      return { witness: 'w', approve: true };
    case 'fill_order':
      return {
        currentPays: '1',
        openPays: '2',
        exchanger: 'e',
        orderId: 1,
      };
    case 'withdraw_route':
      return {
        fromAccount: 'a',
        toAccount: 'b',
        percent: 50,
        autoVest: false,
      };
    case 'change_recovery_account':
      return { account: 'a', newRecoveryAccount: 'b' };
    case 'change_password':
      return { account: 'a' };
    case 'hp_delegation':
      return { delegator: 'a', delegatee: 'b', amount: '1' };
    case 'engine_transfer':
    case 'engine_transfer_out':
      return {
        from: 'a',
        to: 'b',
        amount: '1',
        symbol: 'WAIV',
        memo: null,
      };
    case 'engine_swap':
      return {
        account: 'a',
        symbolOut: 'SWAP.HIVE',
        symbolIn: 'WAIV',
        symbolOutQuantity: '1',
        symbolInQuantity: '2',
      };
    case 'engine_stake':
    case 'engine_delegate':
    case 'engine_undelegate':
      return { from: 'a', to: 'b', amount: '1', symbol: 'WAIV' };
    case 'engine_unstake':
    case 'engine_cancel_unstake':
      return { account: 'a', amount: '1', symbol: 'WAIV' };
    case 'object_update':
      return {
        updateId: 'u',
        updateType: 'title',
        objectName: 'o',
        authorPermlink: 'ap',
      };
    case 'object_update_reject':
      return {
        updateId: 'u',
        updateType: 'title',
        objectName: 'o',
        authorPermlink: 'ap',
        voter: 'v',
      };
    case 'object_status_change':
      return {
        objectName: 'o',
        authorPermlink: 'ap',
        oldStatus: 'a',
        newStatus: 'b',
        account: 'u',
      };
    case 'update_vote_cast':
      return {
        updateId: 'u',
        vote: 'for',
        updateType: 'name',
        objectName: 'o',
        authorPermlink: 'ap',
      };
    case 'object_created':
      return { updateId: 'u', updateType: 'title' };
    case 'batch_import_completed':
      return { cid: 'c' };
    case 'message_direct':
      return {
        channelId: 'ch-1',
        messageId: 'msg-1',
        author: 'alice',
        encrypted: false,
      };
    case 'message_group':
      return {
        channelId: 'grp-1',
        messageId: 'msg-2',
        author: 'alice',
        channelTitle: 'Team',
        encrypted: false,
      };
    case 'bell_object_message':
      return {
        channelId: 'obj-ch-1',
        messageId: 'msg-3',
        author: 'alice',
        encrypted: false,
        objectName: 'Shop',
      };
    case 'obl_offer_publish':
    case 'obl_offer_update':
      return {
        offerId: 'offer-1',
        version: 1,
        kind: 'offer',
        name: 'API',
        author: 'alice',
        arbiter: null,
      };
    case 'obl_offer_retire':
      return {
        offerId: 'offer-1',
        version: 1,
        kind: 'offer',
        name: 'API',
        author: 'alice',
      };
    case 'obl_contract_sign':
      return {
        contractId: 'c-1',
        offerId: 'offer-1',
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      };
    case 'obl_service_order_create':
      return {
        serviceOrderId: 'so-1',
        contractId: 'c-1',
        creator: 'alice',
        provider: 'alice',
        client: 'bob',
      };
    case 'obl_report_create':
      return {
        reportId: 'r-1',
        contractId: 'c-1',
        author: 'alice',
        provider: 'alice',
        client: 'bob',
      };
    case 'obl_invoice_issue':
      return {
        invoiceId: 'inv-1',
        issuer: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '10.00000000',
        contractId: 'c-1',
      };
    case 'obl_payment_declare':
    case 'obl_payment_confirm':
      return {
        paymentId: 'pay-1',
        payer: 'bob',
        receiver: 'alice',
        amountUsd: '10.00000000',
        state: type === 'obl_payment_confirm' ? 'confirmed' : 'pending',
      };
    case 'obl_dispute_open':
      return {
        disputeId: 'd-1',
        invoiceId: 'inv-1',
        disputant: 'bob',
        resolver: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '5.00000000',
      };
    case 'obl_dispute_resolve':
      return {
        disputeId: 'd-1',
        invoiceId: 'inv-1',
        disputant: 'bob',
        resolver: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '5.00000000',
      };
    case 'trx_processed':
      return {};
    default:
      return {};
  }
}
