import { UserObjectPowersUpdateListener } from './user-object-powers-update.listener';
import {
  UserObjectPowersUpdateEvent,
} from './user-object-powers.events';
import type { UserObjectPowersRepository } from '../../repositories';

describe('UserObjectPowersUpdateListener', () => {
  it('calls setRawWaivPowerDelta instead of incrementWaivPower', async () => {
    const repo = {
      findByAccount: jest.fn().mockResolvedValue({
        account: 'alice',
        waiv_power: 100,
        raw_waiv_power: 100,
        waiv_power_dirty: false,
      }),
      setRawWaivPowerDelta: jest.fn().mockResolvedValue(undefined),
      incrementWaivPower: jest.fn(),
    } as unknown as UserObjectPowersRepository;

    const listener = new UserObjectPowersUpdateListener(repo);
    await listener.handle(new UserObjectPowersUpdateEvent('alice', -300));

    expect(repo.setRawWaivPowerDelta).toHaveBeenCalledWith('alice', -300);
    expect(repo.incrementWaivPower).not.toHaveBeenCalled();
  });

  it('skips when account row is missing', async () => {
    const repo = {
      findByAccount: jest.fn().mockResolvedValue(null),
      setRawWaivPowerDelta: jest.fn(),
      incrementWaivPower: jest.fn(),
    } as unknown as UserObjectPowersRepository;

    const listener = new UserObjectPowersUpdateListener(repo);
    await listener.handle(new UserObjectPowersUpdateEvent('alice', 100));

    expect(repo.setRawWaivPowerDelta).not.toHaveBeenCalled();
  });
});
