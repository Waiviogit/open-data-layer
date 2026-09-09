import { ConfigService } from '@nestjs/config';

import {
  buildGalleryItemBroadcastOp,
  buildValidatedUpdateCreateOp,
} from '@opden-data-layer/hive-broadcast';

import type { AgentWalletConfig } from '../config/agent-wallet.config';
import { HasSessionService } from './has-session.service';

jest.mock('@opden-data-layer/hive-broadcast', () => {
  const actual = jest.requireActual('@opden-data-layer/hive-broadcast');
  return {
    ...actual,
    buildValidatedUpdateCreateOp: jest.fn(),
    buildGalleryItemBroadcastOp: jest.fn(),
  };
});

describe('HasSessionService ODL build helpers', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'odlCustomJsonId') {
        return 'odl-testnet';
      }
      return undefined;
    }),
  } as unknown as ConfigService<AgentWalletConfig, true>;

  const service = new HasSessionService(
    config,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildUpdateCreate returns requiresIpfsBatch for oversize payloads', () => {
    const envelopeJson = JSON.stringify({
      events: [{ action: 'update_create', v: 1, payload: { value_text: 'x'.repeat(20_000) } }],
    });
    (buildValidatedUpdateCreateOp as jest.Mock).mockReturnValue({
      type: 'custom_json',
      id: 'odl-testnet',
      json: envelopeJson,
      required_auths: [],
      required_posting_auths: ['alice'],
    });

    const result = service.buildUpdateCreate({
      objectId: 'skill-1',
      creator: 'alice',
      updateType: 'skillContent',
      value: 'x'.repeat(20_000),
    });

    expect(result.requiresIpfsBatch).toBe(true);
    expect(result.ops).toEqual([]);
    expect(result.envelopeJson).toBe(envelopeJson);
  });

  it('buildUpdateCreate returns a single validated op', () => {
    const mockedOp = {
      type: 'custom_json',
      id: 'odl-testnet',
      json: '{"events":[{"action":"update_create"}]}',
      required_auths: [],
      required_posting_auths: ['alice'],
    };
    (buildValidatedUpdateCreateOp as jest.Mock).mockReturnValue(mockedOp);

    const result = service.buildUpdateCreate({
      objectId: 'recipe-demo',
      creator: 'alice',
      updateType: 'image',
      value: { cid: 'QmTest' },
    });

    expect(buildValidatedUpdateCreateOp).toHaveBeenCalledWith({
      id: 'odl-testnet',
      objectId: 'recipe-demo',
      creator: 'alice',
      updateType: 'image',
      value: { cid: 'QmTest' },
      locale: undefined,
      language: undefined,
    });
    expect(result.ops).toEqual([mockedOp]);
    expect(result.opsCount).toBe(1);
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('buildObjectCreate returns requiresIpfsBatch for oversize envelope', () => {
    const result = service.buildObjectCreate({
      objectType: 'legal_document',
      objectId: 'legal-oversize',
      creator: 'alice',
      fields: [{ updateType: 'legalText', value: 'x'.repeat(20_000) }],
    });

    expect(result.requiresIpfsBatch).toBe(true);
    expect(result.ops).toEqual([]);
    expect(result.envelopeJson).toBeDefined();
    expect(result.bytes).toBeGreaterThan(8192);
  });

  it('buildBatchImport returns batch_import op for account and cid', () => {
    const result = service.buildBatchImport({
      account: '@Alice',
      cid: 'QmTest',
    });

    expect(result.opsCount).toBe(1);
    const op = result.ops[0] as {
      json: string;
      required_posting_auths: string[];
      required_auths: string[];
    };
    expect(op.required_posting_auths).toEqual(['alice']);
    expect(op.required_auths).toEqual([]);
    const envelope = JSON.parse(op.json) as {
      events: Array<{ action: string; payload: Record<string, unknown> }>;
    };
    expect(envelope.events).toHaveLength(1);
    expect(envelope.events[0]?.action).toBe('batch_import');
    expect(envelope.events[0]?.payload).toEqual({
      type: 'ipfs',
      ref: 'QmTest',
    });
  });

  it('buildGalleryItem normalizes creator and passes album names', () => {
    const mockedOp = {
      type: 'custom_json',
      id: 'odl-testnet',
      json: '{"events":[{"action":"update_create"}]}',
      required_auths: [],
      required_posting_auths: ['alice'],
    };
    (buildGalleryItemBroadcastOp as jest.Mock).mockReturnValue(mockedOp);

    const result = service.buildGalleryItem({
      objectId: ' recipe-demo ',
      creator: '@Alice',
      itemValue: { album: 'Photos', cid: 'QmTest' },
      existingGalleryAlbumNames: ['Menu'],
    });

    expect(buildGalleryItemBroadcastOp).toHaveBeenCalledWith({
      id: 'odl-testnet',
      objectId: 'recipe-demo',
      creator: 'alice',
      itemValue: { album: 'Photos', cid: 'QmTest' },
      onChainGalleryAlbumNames: ['Menu'],
    });
    expect(result.opsCount).toBe(1);
  });
});
