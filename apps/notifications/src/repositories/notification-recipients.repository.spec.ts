import type { OdlDatabase } from '@opden-data-layer/core';
import type { Kysely } from 'kysely';
import { NotificationRecipientsRepository } from './notification-recipients.repository';

function mockQueryChain<T>(result: T) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(result),
    executeTakeFirst: jest.fn().mockResolvedValue(
      Array.isArray(result) ? result[0] : result,
    ),
  };
  return chain;
}

describe('NotificationRecipientsRepository', () => {
  it('findObjectCreator returns creator account', async () => {
    const chain = mockQueryChain({ creator: 'owner' });
    const db = {
      selectFrom: jest.fn().mockReturnValue(chain),
    } as unknown as Kysely<OdlDatabase>;

    const repo = new NotificationRecipientsRepository(db);
    const creator = await repo.findObjectCreator('obj-1');

    expect(creator).toBe('owner');
    expect(db.selectFrom).toHaveBeenCalledWith('objects_core');
  });

  it('findAdministrativeAuthorities returns account names', async () => {
    const chain = mockQueryChain([
      { account: 'admin1' },
      { account: 'admin2' },
    ]);
    const db = {
      selectFrom: jest.fn().mockReturnValue(chain),
    } as unknown as Kysely<OdlDatabase>;

    const repo = new NotificationRecipientsRepository(db);
    const accounts = await repo.findAdministrativeAuthorities('obj-1');

    expect(accounts).toEqual(['admin1', 'admin2']);
    expect(chain.where).toHaveBeenCalledWith('authority_type', '=', 'administrative');
  });

  it('findBellFollowers returns accounts with bell enabled', async () => {
    const chain = mockQueryChain([{ account: 'fan1' }]);
    const db = {
      selectFrom: jest.fn().mockReturnValue(chain),
    } as unknown as Kysely<OdlDatabase>;

    const repo = new NotificationRecipientsRepository(db);
    const accounts = await repo.findBellFollowers('obj-1');

    expect(accounts).toEqual(['fan1']);
    expect(chain.where).toHaveBeenCalledWith('bell', '=', true);
  });

  it('returns null or empty arrays on query errors', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockRejectedValue(new Error('db')),
      executeTakeFirst: jest.fn().mockRejectedValue(new Error('db')),
    };
    const db = {
      selectFrom: jest.fn().mockReturnValue(chain),
    } as unknown as Kysely<OdlDatabase>;

    const repo = new NotificationRecipientsRepository(db);

    await expect(repo.findObjectCreator('obj')).resolves.toBeNull();
    await expect(repo.findAdministrativeAuthorities('obj')).resolves.toEqual([]);
    await expect(repo.findBellFollowers('obj')).resolves.toEqual([]);
  });
});
