import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { Request } from 'express';
import { IpfsClient } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';
import { UPLOAD_IMAGE_MAX_FILE_BYTES } from '../constants/upload.constants';
import { ImageProcessorService } from '../domain/image-processor.service';

function filenameFromBufferSha256(buffer: Buffer, ext: string): string {
  const hash = createHash('sha256').update(buffer).digest('hex');
  return `${hash}.${ext}`;
}

@Controller('upload')
export class UploadController {
  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Post('image')
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
    await this.ipfsClient.filesCp(result.cid, `${MFS_NAMESPACE.IMAGES}/${filename}`);
    return result;
  }

  /**
   * Stream an arbitrary binary file to IPFS without buffering it in memory.
   * Send raw bytes as Content-Type: application/octet-stream.
   * Optional ?filename=<name> query param controls the MFS entry name.
   * Supports files of any size (e.g. multi-GB).
   */
  @Post('file')
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Req() req: Request,
    @Query('filename') filename?: string,
  ): Promise<{ cid: string; url?: string }> {
    const name = filename?.trim() || `upload-${Date.now()}.bin`;
    const result = await this.ipfsClient.addStream(req as unknown as Readable, name);
    const safeName = name.replace(/[^\w.-]/g, '_');
    await this.ipfsClient.filesCp(result.cid, `${MFS_NAMESPACE.FILES}/${safeName}`);
    return result;
  }
}
