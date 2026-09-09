import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import type { Request } from 'express';
import { IpfsClient, JwtAccessGuard } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';
import {
  UPLOAD_FILE_MAX_BYTES,
  UPLOAD_IMAGE_MAX_FILE_BYTES,
} from '../constants/upload.constants';
import { ImageProcessorService } from '../domain/image-processor.service';

function filenameFromBufferSha256(buffer: Buffer, ext: string): string {
  const hash = createHash('sha256').update(buffer).digest('hex');
  return `${hash}.${ext}`;
}

const FILE_TOO_LARGE_ERROR = 'FILE_TOO_LARGE';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Post('image')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_IMAGE_MAX_FILE_BYTES },
    }),
  )
  async uploadImage(
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype: string; originalname: string }
      | undefined,
  ): Promise<{ cid: string; url?: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Missing file field "file"');
    }
    const mimetype = file.mimetype || 'application/octet-stream';
    const webp = await this.imageProcessor.toWebp(file.buffer, mimetype);
    const filename = filenameFromBufferSha256(webp, 'webp');
    const result = await this.ipfsClient.add(webp, filename);
    const mfsPath = `${MFS_NAMESPACE.IMAGES}/${filename}`;
    const cid = await this.ipfsClient.filesCpResolveCid(result.cid, mfsPath);
    return { cid, url: result.url };
  }

  /**
   * Stream a binary file to IPFS (max {@link UPLOAD_FILE_MAX_BYTES} bytes).
   * Send raw bytes as Content-Type: application/octet-stream.
   * Optional ?filename=<name> query param controls the MFS entry name.
   */
  @Post('file')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Req() req: Request,
    @Query('filename') filename?: string,
  ): Promise<{ cid: string; url?: string }> {
    const declaredRaw = req.headers['content-length'];
    const declared =
      declaredRaw != null ? Number(declaredRaw) : 0;
    if (Number.isFinite(declared) && declared > UPLOAD_FILE_MAX_BYTES) {
      throw new PayloadTooLargeException('File too large');
    }

    let bytesRead = 0;
    const limitedStream = (req as unknown as Readable).pipe(
      new Transform({
        transform(chunk: Buffer, _enc, cb) {
          if (bytesRead + chunk.length > UPLOAD_FILE_MAX_BYTES) {
            cb(new Error(FILE_TOO_LARGE_ERROR));
            return;
          }
          bytesRead += chunk.length;
          cb(null, chunk);
        },
      }),
    );

    const name = filename?.trim() || `upload-${Date.now()}.bin`;
    const streamError = new Promise<never>((_, reject) => {
      limitedStream.on('error', (err: Error) => {
        if (err.message === FILE_TOO_LARGE_ERROR) {
          reject(new PayloadTooLargeException('File too large'));
          return;
        }
        reject(err);
      });
    });
    const result = await Promise.race([
      this.ipfsClient.addStream(limitedStream, name),
      streamError,
    ]);
    const safeName = name.replace(/[^\w.-]/g, '_');
    const mfsPath = `${MFS_NAMESPACE.FILES}/${safeName}`;
    const cid = await this.ipfsClient.filesCpResolveCid(result.cid, mfsPath);
    return { cid, url: result.url };
  }
}
