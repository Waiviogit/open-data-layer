import {
  batchImportChildEventSchema,
  batchImportPayloadSchema,
} from './odl-envelope.schema';

describe('batchImportPayloadSchema', () => {
  it('rejects batch reference that is an IPFS path rather than a bare CID', () => {
    const result = batchImportPayloadSchema.safeParse({
      type: 'ipfs',
      ref: 'QmAbc/dir/file',
    });
    expect(result.success).toBe(false);
  });
});

describe('batchImportChildEventSchema', () => {
  it('accepts update_user_metadata for IPFS batch replay', () => {
    const result = batchImportChildEventSchema.safeParse({
      action: 'update_user_metadata',
      v: 1,
      payload: {
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
      },
    });
    expect(result.success).toBe(true);
  });
});
