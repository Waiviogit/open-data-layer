import { deriveAccountKeys } from '@opden-data-layer/hive-account';

import { HiveAccountGenerateService } from './hive-account-generate.service';
import type { HiveChainContextService } from './hive-chain-context.service';

describe('HiveAccountGenerateService', () => {
  const getAccount = jest.fn();
  const chainContext = { getAccount } as unknown as HiveChainContextService;
  const service = new HiveAccountGenerateService(chainContext);

  beforeEach(() => {
    getAccount.mockReset();
  });

  it('rejects an uppercase name before RPC', async () => {
    await expect(service.generateAccountKeys({ account: 'AB' })).rejects.toThrow(
      /Invalid Hive account name/,
    );
    expect(getAccount).not.toHaveBeenCalled();
  });

  it('rejects a short dot segment before RPC', async () => {
    await expect(service.generateAccountKeys({ account: 'a.bc' })).rejects.toThrow(
      /Invalid Hive account name/,
    );
    expect(getAccount).not.toHaveBeenCalled();
  });

  it('rejects a name that already exists', async () => {
    getAccount.mockResolvedValue({ name: 'alice' });

    await expect(service.generateAccountKeys({ account: 'alice' })).rejects.toThrow(
      'Hive account already exists: alice',
    );
    expect(getAccount).toHaveBeenCalledWith('alice');
  });

  it('derives keys for a free lowercase name', async () => {
    getAccount.mockResolvedValue(null);

    const result = await service.generateAccountKeys({ account: 'alice' });

    expect(result.account).toBe('alice');
    expect(result.masterPassword.startsWith('P')).toBe(true);
    expect(Object.keys(result.keys).sort()).toEqual(
      ['active', 'memo', 'owner', 'posting'].sort(),
    );
    expect(result.keys).toEqual(
      deriveAccountKeys('alice', result.masterPassword),
    );
    expect(getAccount).toHaveBeenCalledTimes(1);
    expect(getAccount).toHaveBeenCalledWith('alice');
  });

  it('strips @ and lowercases before lookup and output', async () => {
    getAccount.mockResolvedValue(null);

    const result = await service.generateAccountKeys({ account: '@Alice' });

    expect(result.account).toBe('alice');
    expect(result.keys).toEqual(
      deriveAccountKeys('alice', result.masterPassword),
    );
    expect(getAccount).toHaveBeenCalledWith('alice');
  });

  it('rethrows when account lookup fails', async () => {
    getAccount.mockRejectedValue(new Error('RPC unavailable'));

    await expect(service.generateAccountKeys({ account: 'alice' })).rejects.toThrow(
      'RPC unavailable',
    );
  });

  it('rejects empty input without RPC', async () => {
    await expect(service.generateAccountKeys({ account: '' })).rejects.toThrow(
      /Invalid Hive account name/,
    );
    expect(getAccount).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only input without RPC', async () => {
    await expect(service.generateAccountKeys({ account: '   ' })).rejects.toThrow(
      /Invalid Hive account name/,
    );
    expect(getAccount).not.toHaveBeenCalled();
  });

  it('trims spaces before a taken-name check', async () => {
    getAccount.mockResolvedValue({ name: 'alice' });

    await expect(
      service.generateAccountKeys({ account: '  alice  ' }),
    ).rejects.toThrow('Hive account already exists: alice');
    expect(getAccount).toHaveBeenCalledWith('alice');
  });
});
