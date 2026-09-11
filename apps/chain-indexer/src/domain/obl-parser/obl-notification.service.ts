import { Injectable } from '@nestjs/common';
import type { OdlEventContext } from '../odl-shared';
import { NotificationEmitterService } from '../notification-adapter/notification-emitter.service';

type NotificationEventBody = Parameters<
  NotificationEmitterService['emitWithContext']
>[1];

@Injectable()
export class OblNotificationService {
  constructor(private readonly notificationEmitter: NotificationEmitterService) {}

  emit(ctx: OdlEventContext, body: NotificationEventBody): void {
    this.notificationEmitter.emitWithContext(
      this.notificationEmitter.odlContext(ctx),
      body,
    );
  }
}
