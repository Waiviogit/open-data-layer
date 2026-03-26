import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import {
  batchImportPayloadSchema,
  type BatchImportPayload,
} from '../odl-envelope.schema';

export const BATCH_IMPORT_PROCESS_EVENT = 'batch_import.process' as const;

export interface BatchImportProcessPayload {
  payload: BatchImportPayload;
  ctx: OdlEventContext;
}

@Injectable()
export class BatchImportHandler implements OdlActionHandler {
  readonly action = 'batch_import';
  private readonly logger = new Logger(BatchImportHandler.name);

  constructor(private readonly emitter: EventEmitter2) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = batchImportPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid batch_import payload: ${result.error.message}`);
      return;
    }

    const eventPayload: BatchImportProcessPayload = {
      payload: result.data,
      ctx,
    };
    this.emitter.emit(BATCH_IMPORT_PROCESS_EVENT, eventPayload);
  }
}
