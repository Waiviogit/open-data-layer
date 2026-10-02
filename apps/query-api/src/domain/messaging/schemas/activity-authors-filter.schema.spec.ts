import { objectThreadsFeedBodySchema } from '../../feed/schemas/object-threads-feed.schema';
import { userThreadsFeedBodySchema } from '../../feed/schemas/user-threads-feed.schema';
import {
  messageHistoryBodySchema,
  objectActivityMessageHistoryBodySchema,
} from './messaging.schema';

describe('activity authors filter schemas', () => {
  it('does not carry authors_only on DM channel messages', () => {
    const parsed = messageHistoryBodySchema.parse({ limit: 5, authors_only: true });
    expect(parsed).not.toHaveProperty('authors_only');
  });

  it('does not carry authors_only on user threads', () => {
    const parsed = userThreadsFeedBodySchema.parse({ authors_only: true });
    expect(parsed).not.toHaveProperty('authors_only');
  });

  it('rejects a blank overlay id', () => {
    expect(
      objectActivityMessageHistoryBodySchema.safeParse({
        authors_only: true,
        authors_governance_object_id: '   ',
      }).success,
    ).toBe(false);
  });

  it('rejects a non-boolean authors_only on both new schemas', () => {
    expect(
      objectActivityMessageHistoryBodySchema.safeParse({ authors_only: 'yes' }).success,
    ).toBe(false);
    expect(objectThreadsFeedBodySchema.safeParse({ authors_only: 'yes' }).success).toBe(false);
  });
});
