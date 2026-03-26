import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/tiff',
]);

const WEBP_QUALITY = 80;

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  async toWebp(buffer: Buffer, mimetype: string): Promise<Buffer> {
    const normalized = mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
    if (!ALLOWED_IMAGE_MIME.has(normalized)) {
      throw new BadRequestException(
        `Unsupported image type: ${mimetype}. Allowed: ${[...ALLOWED_IMAGE_MIME].join(', ')}`,
      );
    }

    try {
      const pipeline = sharp(buffer);
      const metadata = await pipeline.metadata();
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image: could not read dimensions');
      }
      return pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Image validation/conversion failed: ${msg}`);
      throw new BadRequestException('Invalid or corrupted image file');
    }
  }
}
