import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { z } from 'zod';

@Injectable()
export class ZodBodyPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Request body validation failed',
        issues: result.error.flatten(),
      });
    }
    return result.data;
  }
}
