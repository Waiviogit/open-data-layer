import { PayloadTooLargeException } from '@nestjs/common';
import { Readable } from 'node:stream';

jest.mock('../constants/upload.constants', () => ({
  UPLOAD_FILE_MAX_BYTES: 2048,
  UPLOAD_IMAGE_MAX_FILE_BYTES: 50 * 1024 * 1024,
}));

import { UPLOAD_FILE_MAX_BYTES } from '../constants/upload.constants';
import { UploadController } from './upload.controller';

function mockRequest(
  stream: Readable,
  headers: Record<string, string> = {},
) {
  const req = stream as Readable & { headers: Record<string, string> };
  req.headers = headers;
  return req as never;
}

function consumeStream(stream: Readable): Promise<{ cid: string; url?: string }> {
  return new Promise((resolve, reject) => {
    stream.on('data', () => undefined);
    stream.on('error', reject);
    stream.on('end', () =>
      resolve({
        cid: 'bafyTest',
        url: 'https://example.com/ipfs/bafyTest',
      }),
    );
  });
}

describe('UploadController uploadFile', () => {
  const ipfsClient = {
    addStream: jest.fn((stream: Readable) => consumeStream(stream)),
    filesCpResolveCid: jest.fn().mockResolvedValue('bafyTest'),
  };
  const controller = new UploadController(
    ipfsClient as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-022: rejects declared Content-Length over cap', async () => {
    const req = mockRequest(Readable.from([]), {
      'content-length': String(UPLOAD_FILE_MAX_BYTES + 1),
    });

    await expect(controller.uploadFile(req)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
    expect(ipfsClient.addStream).not.toHaveBeenCalled();
  });

  it('TC-023: aborts mid-stream when body exceeds cap', async () => {
    const body = Buffer.alloc(UPLOAD_FILE_MAX_BYTES + 1024, 1);
    const req = mockRequest(
      Readable.from([body.subarray(0, 1024), body.subarray(1024)]),
    );

    await expect(controller.uploadFile(req)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
    expect(ipfsClient.filesCpResolveCid).not.toHaveBeenCalled();
  });

  it('TC-024: accepts body exactly at cap', async () => {
    const body = Buffer.alloc(UPLOAD_FILE_MAX_BYTES, 1);
    const req = mockRequest(Readable.from([body]));

    const result = await controller.uploadFile(req);

    expect(result).toEqual({
      cid: 'bafyTest',
      url: 'https://example.com/ipfs/bafyTest',
    });
    expect(ipfsClient.addStream).toHaveBeenCalledTimes(1);
    expect(ipfsClient.filesCpResolveCid).toHaveBeenCalled();
  });
});
