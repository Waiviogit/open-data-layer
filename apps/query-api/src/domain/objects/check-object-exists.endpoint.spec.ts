import { CheckObjectExistsEndpoint } from './check-object-exists.endpoint';

describe('CheckObjectExistsEndpoint', () => {
  it('returns true when object exists in objects_core', async () => {
    const objectsCore = {
      findByObjectId: jest.fn().mockResolvedValue({ object_id: 'kjc-my-object' }),
    };
    const endpoint = new CheckObjectExistsEndpoint(
      objectsCore as never,
    );
    await expect(endpoint.execute('kjc-my-object')).resolves.toBe(true);
  });

  it('returns false when object is not found', async () => {
    const objectsCore = {
      findByObjectId: jest.fn().mockResolvedValue(undefined),
    };
    const endpoint = new CheckObjectExistsEndpoint(
      objectsCore as never,
    );
    await expect(endpoint.execute('new-id')).resolves.toBe(false);
  });
});
