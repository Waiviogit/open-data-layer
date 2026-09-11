import { AccountEnsureService } from './account-ensure.service';

const ACCOUNT_CREATE_PAYLOAD = {
  fee: '3.000 HIVE',
  owner: {
    key_auths: [['STM5JCXwH8KDshDwc6iCfjrDkJvvVZ93dBmxsYW4VFZ5FNxr5EaHo', 1]],
    account_auths: [],
    weight_threshold: 1,
  },
  active: {
    key_auths: [['STM8Tq6oA8223cMmpZQwasw923X3dFU7mZaWdesNaQCyri1rL8Aug', 1]],
    account_auths: [],
    weight_threshold: 1,
  },
  creator: 'flowmaster',
  posting: {
    key_auths: [['STM5J3ZZpMfHDYfuLAHTixPw5eYwycF96sGXgR1SkppXsPChxvrgA', 1]],
    account_auths: [],
    weight_threshold: 1,
  },
  memo_key: 'STM5XAS1mK4tnR6hB976AajBosUszqrp2e44UmJ57MNxADWpzZRAo',
  json_metadata: '{}',
  new_account_name: 'insta.agent',
};

describe('AccountEnsureService', () => {
  const accounts = {
    findByName: jest.fn(),
    create: jest.fn(),
  };
  const accountSyncQueue = {
    enqueue: jest.fn(),
  };

  let service: AccountEnsureService;

  beforeEach(() => {
    jest.clearAllMocks();
    accounts.findByName.mockResolvedValue(undefined);
    accounts.create.mockResolvedValue(undefined);
    accountSyncQueue.enqueue.mockResolvedValue(undefined);
    service = new AccountEnsureService(accounts as never, accountSyncQueue as never);
  });

  it('inserts a minimal accounts_current row and enqueues sync for account_create', async () => {
    await service.ensureFromCreateAccountPayload(ACCOUNT_CREATE_PAYLOAD);

    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'insta.agent' }),
    );
    expect(accountSyncQueue.enqueue).toHaveBeenCalledWith(
      'insta.agent',
      expect.any(Number),
    );
  });

  it('is a no-op without new_account_name', async () => {
    await service.ensureFromCreateAccountPayload({
      creator: 'flowmaster',
      fee: '3.000 HIVE',
    });

    expect(accounts.findByName).not.toHaveBeenCalled();
    expect(accounts.create).not.toHaveBeenCalled();
    expect(accountSyncQueue.enqueue).not.toHaveBeenCalled();
  });
});
