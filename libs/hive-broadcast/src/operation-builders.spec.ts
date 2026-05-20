import { wireCommentOptionsPayload } from './hive-operation-wire';
import {
  buildCommentOptionsBeneficiaryExtension,
  buildCommentOptionsOp,
  buildCommentOp,
  buildHiveFollowOp,
  buildHiveUnfollowOp,
} from './operation-builders';

describe('buildHiveFollowOp', () => {
  it('uses id follow with blog what', () => {
    const op = buildHiveFollowOp('flowmaster', 'serpent7776');
    expect(op.type).toBe('custom_json');
    expect(op.id).toBe('follow');
    expect(op.required_posting_auths).toEqual(['flowmaster']);
    const inner = JSON.parse(op.json) as [string, { follower: string; following: string; what: string[] }];
    expect(inner[0]).toBe('follow');
    expect(inner[1]).toEqual({
      follower: 'flowmaster',
      following: 'serpent7776',
      what: ['blog'],
    });
  });
});

describe('buildHiveUnfollowOp', () => {
  it('uses id follow with empty what', () => {
    const op = buildHiveUnfollowOp('flowmaster', 'nostalgic1212');
    const inner = JSON.parse(op.json) as [string, { follower: string; following: string; what: string[] }];
    expect(inner[1].what).toEqual([]);
  });
});

describe('buildCommentOptionsBeneficiaryExtension', () => {
  it('returns extension id 0 with beneficiaries', () => {
    const ext = buildCommentOptionsBeneficiaryExtension([
      { account: 'waivio', weight: 300 },
    ]);
    expect(ext[0]).toBe(0);
    expect(ext[1]).toEqual({
      beneficiaries: [{ account: 'waivio', weight: 300 }],
    });
  });
});

describe('buildCommentOptionsOp', () => {
  it('includes percent_hbd when provided', () => {
    const ext = buildCommentOptionsBeneficiaryExtension([{ account: 'waivio', weight: 300 }]);
    const op = buildCommentOptionsOp({
      author: 'flowmaster',
      permlink: 'vapva',
      allow_votes: true,
      allow_curation_rewards: true,
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10_000,
      extensions: [ext],
    });
    expect(op.percent_hbd).toBe(10_000);
    expect(op.extensions).toHaveLength(1);
  });
});

describe('wireCommentOptionsPayload', () => {
  it('matches Keychain wire shape with percent_hbd and extensions', () => {
    const ext = buildCommentOptionsBeneficiaryExtension([{ account: 'waivio', weight: 300 }]);
    const op = buildCommentOptionsOp({
      author: 'flowmaster',
      permlink: 'vapva',
      allow_votes: true,
      allow_curation_rewards: true,
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10_000,
      extensions: [ext],
    });
    expect(wireCommentOptionsPayload(op)).toEqual({
      author: 'flowmaster',
      permlink: 'vapva',
      allow_votes: true,
      allow_curation_rewards: true,
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10_000,
      extensions: [ext],
    });
  });

  it('omits percent_hbd key when undefined', () => {
    const op = buildCommentOptionsOp({
      author: 'a',
      permlink: 'b',
      allow_votes: true,
      allow_curation_rewards: true,
      max_accepted_payout: '0.000 HBD',
      extensions: [],
    });
    expect(wireCommentOptionsPayload(op)['percent_hbd']).toBeUndefined();
  });
});

describe('comment + comment_options payload', () => {
  it('builds two-operation payload for a comment with options', () => {
    const jsonMetadata =
      '{"community":"waivio","app":"waivio/1.0.0","format":"markdown","timeOfPostCreation":1775818918902,"host":"waivio.com","tags":["waivio"],"users":[],"links":[],"image":[]}';
    const comment = buildCommentOp({
      parent_author: '',
      parent_permlink: 'waivio',
      author: 'flowmaster',
      permlink: 'vapva',
      title: 'вапва',
      body: 'апва\n',
      json_metadata: jsonMetadata,
    });
    const ext = buildCommentOptionsBeneficiaryExtension([{ account: 'waivio', weight: 300 }]);
    const options = buildCommentOptionsOp({
      author: 'flowmaster',
      permlink: 'vapva',
      allow_votes: true,
      allow_curation_rewards: true,
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10_000,
      extensions: [ext],
    });
    expect(comment.type).toBe('comment');
    expect(options.type).toBe('comment_options');
    expect({ operations: [comment, options] }).toEqual({
      operations: [
        expect.objectContaining({ type: 'comment', permlink: 'vapva' }),
        expect.objectContaining({ type: 'comment_options', percent_hbd: 10_000 }),
      ],
    });
  });
});
