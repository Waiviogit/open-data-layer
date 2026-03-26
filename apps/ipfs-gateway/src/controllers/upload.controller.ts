import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { IpfsClient } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';
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
  @UseInterceptors(FileInterceptor('file'))
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

  @Post('json')
  @HttpCode(HttpStatus.CREATED)
  async uploadJson(@Body() body: unknown): Promise<{ cid: string; url?: string }> {
    const buf = Buffer.from(JSON.stringify(body), 'utf8');
    const filename = filenameFromBufferSha256(buf, 'json');
    const result = await this.ipfsClient.add(buf, filename);
    await this.ipfsClient.filesCp(result.cid, `${MFS_NAMESPACE.JSON}/${filename}`);
    return result;
  }
}
