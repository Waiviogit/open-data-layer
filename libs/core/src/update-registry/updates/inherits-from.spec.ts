import { UPDATE_INHERITS_FROM } from './inherits-from';

describe('UPDATE_INHERITS_FROM', () => {
  it('accepts authors in scope and rejects unknown tokens', () => {
    expect(
      UPDATE_INHERITS_FROM.schema.safeParse({
        object_id: 'gov-x',
        scope: ['authors'],
      }).success,
    ).toBe(true);
    expect(
      UPDATE_INHERITS_FROM.schema.safeParse({
        object_id: 'gov-x',
        scope: ['bogus'],
      }).success,
    ).toBe(false);
  });
});
