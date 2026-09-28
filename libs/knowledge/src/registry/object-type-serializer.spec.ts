import { objectTypeExamplePayload } from './object-type-serializer';

describe('objectTypeExamplePayload', () => {
  it('puts the account in required_posting_auths, not the payload', () => {
    const payload = objectTypeExamplePayload('recipe');
    expect(payload).toContain('required_posting_auths: [account]');
    expect(payload).not.toContain('creator');
    expect(payload).toContain("object_type: 'recipe'");
  });
});
