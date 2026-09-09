import {
  buildOdlBatchImportOp,
  buildOdlUpdateCreateOp,
  exceedsHiveCustomJsonLimit,
} from '@opden-data-layer/hive-broadcast';

import { broadcastOdlOpWithOverflow } from './broadcast-odl-op-with-overflow';

const mockBroadcast = jest.fn();
jest.mock('@/modules/auth', () => ({
  getWalletFacade: jest.fn(() => ({
    broadcast: mockBroadcast,
  })),
}));

jest.mock('@/modules/object-create/infrastructure/actions/upload-odl-to-ipfs.action', () => ({
  uploadOdlToIpfs: jest.fn(),
}));

jest.mock('@/modules/notifications', () => ({
  awaitTrxConfirmation: jest.fn().mockResolvedValue(undefined),
  awaitBatchImportByTrx: jest.fn().mockResolvedValue(undefined),
}));

const { uploadOdlToIpfs } = jest.requireMock(
  '@/modules/object-create/infrastructure/actions/upload-odl-to-ipfs.action',
) as { uploadOdlToIpfs: jest.Mock };

const { awaitBatchImportByTrx } = jest.requireMock('@/modules/notifications') as {
  awaitBatchImportByTrx: jest.Mock;
};

describe('broadcastOdlOpWithOverflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBroadcast.mockResolvedValue({ transactionId: 'trx-1' });
  });

  it('broadcasts a small update directly without touching IPFS', async () => {
    const op = buildOdlUpdateCreateOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      updateType: 'name',
      creator: 'alice',
      valueKind: 'text',
      value: 'Shop',
      required_posting_auths: ['alice'],
    });

    expect(exceedsHiveCustomJsonLimit(op.json)).toBe(false);

    const result = await broadcastOdlOpWithOverflow({
      op,
      account: 'alice',
      odlCustomJsonId: 'odl-testnet',
      objectId: 'obj-1',
    });

    expect(result).toEqual({
      success: true,
      transactionId: 'trx-1',
      usedIpfsBatch: false,
    });
    expect(uploadOdlToIpfs).not.toHaveBeenCalled();
    expect(mockBroadcast).toHaveBeenCalledWith({ operations: [op] });
    expect(awaitBatchImportByTrx).not.toHaveBeenCalled();
  });

  it('broadcasts an oversize update as batch_import referencing uploaded CID', async () => {
    uploadOdlToIpfs.mockResolvedValue({ cid: 'QmTest' });

    const op = buildOdlUpdateCreateOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      updateType: 'skillContent',
      creator: 'alice',
      valueKind: 'text',
      value: 'x'.repeat(20_000),
      required_posting_auths: ['alice'],
    });

    expect(exceedsHiveCustomJsonLimit(op.json)).toBe(true);

    const result = await broadcastOdlOpWithOverflow({
      op,
      account: 'alice',
      odlCustomJsonId: 'odl-testnet',
      objectId: 'obj-1',
    });

    expect(uploadOdlToIpfs).toHaveBeenCalledWith(op.json, 'obj-1');
    expect(result).toEqual({
      success: true,
      transactionId: 'trx-1',
      usedIpfsBatch: true,
    });

    const batchOp = buildOdlBatchImportOp({
      id: 'odl-testnet',
      account: 'alice',
      cid: 'QmTest',
    });
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledWith({ operations: [batchOp] });
    expect(awaitBatchImportByTrx).toHaveBeenCalledWith('trx-1');
  });

  it('returns upload_failed without broadcasting when IPFS upload fails', async () => {
    uploadOdlToIpfs.mockResolvedValue({ error: 'upload_failed' });

    const op = buildOdlUpdateCreateOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      updateType: 'pageContent',
      creator: 'alice',
      valueKind: 'text',
      value: 'x'.repeat(20_000),
      required_posting_auths: ['alice'],
    });

    const result = await broadcastOdlOpWithOverflow({
      op,
      account: 'alice',
      odlCustomJsonId: 'odl-testnet',
      objectId: 'obj-1',
    });

    expect(result).toEqual({ success: false, error: 'upload_failed' });
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('returns unauthorized without broadcasting when IPFS upload is unauthorized', async () => {
    uploadOdlToIpfs.mockResolvedValue({ error: 'unauthorized' });

    const op = buildOdlUpdateCreateOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      updateType: 'pageContent',
      creator: 'alice',
      valueKind: 'text',
      value: 'x'.repeat(20_000),
      required_posting_auths: ['alice'],
    });

    const result = await broadcastOdlOpWithOverflow({
      op,
      account: 'alice',
      odlCustomJsonId: 'odl-testnet',
      objectId: 'obj-1',
    });

    expect(result).toEqual({ success: false, error: 'unauthorized' });
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('preserves locale in the uploaded envelope for oversize localizable updates', async () => {
    uploadOdlToIpfs.mockResolvedValue({ cid: 'QmLocale' });

    const op = buildOdlUpdateCreateOp({
      id: 'odl-testnet',
      objectId: 'obj-1',
      updateType: 'description',
      creator: 'alice',
      valueKind: 'text',
      value: 'x'.repeat(20_000),
      locale: 'uk',
      required_posting_auths: ['alice'],
    });

    await broadcastOdlOpWithOverflow({
      op,
      account: 'alice',
      odlCustomJsonId: 'odl-testnet',
      objectId: 'obj-1',
    });

    const uploadedJson = uploadOdlToIpfs.mock.calls[0]?.[0] as string;
    const envelope = JSON.parse(uploadedJson) as {
      events: Array<{ payload: { locale?: string; value_text?: string } }>;
    };
    expect(envelope.events[0]?.payload.locale).toBe('uk');
    expect(envelope.events[0]?.payload.value_text).toHaveLength(20_000);
  });
});
