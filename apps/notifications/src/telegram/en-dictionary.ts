/**
 * Telegram-only copy. Uses explicit Hive account names ({recipient} = subscribed account)
 * instead of "you/your" because one chat may follow multiple accounts.
 */
export const EN_NOTIFICATION_DICTIONARY: Readonly<Record<string, string>> = {
  change_password: 'Account {account} initiated a password change procedure',
  change_recovery_account:
    '{account_to_recover} initiated change recovery account on {new_recovery_account}',
  claim_reward_notify:
    '{recipient} claimed reward {rewardHIVE}, {rewardHBD}, {rewardHP}',
  fill_order_notification:
    '{recipient} sold {current_pays} and bought {open_pays} from {exchanger}',
  import_update: 'Batch import completed for {cid}',
  my_comment_notify: '{recipient} replied to {parentAuthor}',
  my_like_notify: '{recipient} liked {post}',
  my_post_notify: '{recipient} created post {post}',
  notification_approved_witness: '{username} approved witness for {recipient}',
  notification_bell_follow: '{follower} followed {following}',
  notification_bell_object_post: '{author} referenced {wobjectName}',
  notification_bell_post: 'New post by {username}: {title}',
  notification_bell_reblog: "{account} re-blogged {author}'s post: {title}",
  notification_bell_object_message: '{author} sent a message to {objectName}',
  notification_message_direct: '{author} sent a new message to {recipient}',
  notification_message_group: '{channelTitle} has new messages',
  notification_downvoted_username_post:
    "{username} downvoted {recipient}'s post",
  notification_engine_delegate: '{from} delegated {amount} to {to}',
  notification_engine_power_down: "{from} initiated 'Power Down' on {amount}",
  notification_engine_stake: '{from} staked {amount} to {to}',
  notification_engine_swap: '{recipient} swapped {amountOut} for {amountIn}',
  notification_engine_undelegate: '{from} undelegated {amount} from {to}',
  notification_engine_unstake: '{account} unstaked {amount}',
  notification_following_username: '{username} started following {recipient}',
  notification_generic_default_message: 'New notification for {recipient}',
  notification_group_id_update: '{user} used the group ID for {objectName}',
  notification_group_id_update_reject:
    '{user} removed the group ID from {objectName}',
  notification_hp_delegation: '{delegator} delegated {amount} to {delegatee}',
  notification_hp_undelegation: '{delegator} undelegated HIVE from {delegatee}',
  notification_mention_username_comment:
    '{username} mentioned {recipient} in a comment',
  notification_mention_username_post: '{username} mentioned {recipient} in a post',
  notification_object_bell_thread: '{author} published thread to {objectName}',
  notification_object_update: '{user} added a new {update} for {objectName}',
  notification_object_update_reject:
    '{user} rejected the {update} for {objectName}',
  notification_update_vote_cast:
    '{user} approved the {update} for {objectName}',
  notification_reblogged_username_post: "{username} reblogged {recipient}'s post",
  notification_reply_username_comment:
    "{username} has replied to {recipient}'s comment",
  notification_reply_username_post: "{username} commented on {recipient}'s post",
  notification_thread_author_follower: '{author} published thread about {names}',
  notification_transfer_from_savings: '{recipient} withdrew {amount} from savings',
  notification_transfer_username_amount: '{username} transferred {amount} to {to}',
  notification_unapproved_witness: '{username} unapproved witness for {recipient}',
  like_post_notify_other:
    '{voter} and {likesCount} others liked {recipient}\'s post {postTitle}',
  like_post_notify_priority: '{voter} liked {recipient}\'s post {postTitle}',
  power_down_notification: '{username} initiated PowerDown on {amount}',
  power_up_initiated_actor: "{from} initiated 'Power up' on {amount} to {to}",
  power_up_initiated_to: "{recipient} initiated 'Power up' on {amount} to {to}",
  transfer_from: '{recipient} transferred {amount} to {to}',
  transfer_to_vesting: "{from} initiated 'Power Up' on {amount} to {to}",
  withdraw_route_to: '{recipient} set withdraw route to {to_account}',
  notification_obl_offer_publish: '{author} published {kind} {name}',
  notification_obl_offer_update: '{author} updated {kind} {name}',
  notification_obl_offer_retire: '{author} retired {kind} {name}',
  notification_obl_contract_sign:
    '{signer} signed contract {contractId} ({provider} / {client})',
  notification_obl_service_order_create:
    '{creator} created service order {serviceOrderId}',
  notification_obl_report_create: '{author} created report {reportId}',
  notification_obl_invoice_issue:
    '{issuer} issued invoice {invoiceId} to {debtor} ({amountUsd} USD)',
  notification_obl_payment_declare:
    '{payer} declared payment {amountUsd} USD to {receiver}',
  notification_obl_payment_confirm:
    '{receiver} confirmed payment {amountUsd} USD from {payer}',
  notification_obl_dispute_open:
    '{disputant} opened dispute {disputeId} on invoice {invoiceId}',
  notification_obl_dispute_resolve:
    '{resolver} resolved dispute {disputeId} ({amountUsd} USD)',
} as const;
