import { buildOslHiveEngineDepositOp, buildOslUpdateUserMetadataOp, buildOslUpdateUserNotificationSettingsOp } from './osl-operations';

describe('osl-operations', () => {
  it('buildOslHiveEngineDepositOp uses osl-mainnet and hive_engine_deposit', () => {
    const op = buildOslHiveEngineDepositOp({
      id: 'osl-mainnet',
      account: 'alice',
      payload: {
        author: 'alice',
        destination: 'alice',
        symbol_in: 'HIVE',
        symbol_out: 'SWAP.HIVE',
        pair: 'HIVE -> SWAP.HIVE',
        ex_rate: 1,
        deposit_account: 'honey-swap',
        memo: '{}',
      },
    });
    expect(op.id).toBe('osl-mainnet');
    expect(op.required_posting_auths).toEqual(['alice']);
    const parsed = JSON.parse(op.json) as {
      events: { action: string; v: number; payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.action).toBe('hive_engine_deposit');
    expect(parsed.events[0]?.v).toBe(1);
    expect(parsed.events[0]?.payload['symbol_in']).toBe('HIVE');
  });

  it('buildOslUpdateUserNotificationSettingsOp uses osl-mainnet envelope', () => {
    const op = buildOslUpdateUserNotificationSettingsOp({
      id: 'osl-mainnet',
      creator: 'alice',
      required_posting_auths: ['alice'],
      settings: {
        follow: true,
        reblog: true,
        reply: true,
        mention: true,
        vote: true,
        downvote: false,
        claimed_object_updates: true,
        group_id_control: true,
        followed_user_threads: true,
        transfer: true,
        fill_order: true,
        power_up: true,
        claim_reward: false,
        witness_vote: true,
        my_post: false,
        my_comment: false,
        my_like: false,
        minimal_transfer: 5,
        messages: true,
        obl: true,
      },
    });
    expect(op.id).toBe('osl-mainnet');
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('update_user_notification_settings');
    expect(parsed.events[0]?.payload).toMatchObject({
      follow: true,
      minimal_transfer: 5,
      downvote: false,
      messages: true,
      obl: true,
    });
  });

  it('buildOslUpdateUserMetadataOp uses osl-mainnet envelope', () => {
    const op = buildOslUpdateUserMetadataOp({
      id: 'osl-mainnet',
      creator: 'alice',
      required_posting_auths: ['alice'],
      metadata: {
        notifications_last_timestamp: 0,
        exit_page_setting: true,
        locale: 'en-US',
        post_locales: [],
        nightmode: false,
        reward_setting: '50',
        rewrite_links: false,
        show_nsfw_posts: false,
        upvote_setting: false,
        vote_percent: 5000,
        voting_power: true,
        currency: null,
        hide_linked_objects: false,
        hide_recipe_objects: false,
        hide_favorite_objects: true,
      },
    });
    expect(op.id).toBe('osl-mainnet');
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]?.action).toBe('update_user_metadata');
    expect(parsed.events[0]?.payload).toMatchObject({
      locale: 'en-US',
      hide_favorite_objects: true,
    });
  });
});
