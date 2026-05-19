import { Module } from '@nestjs/common';
import { NotificationRecipientsRepository } from './notification-recipients.repository';

@Module({
  providers: [NotificationRecipientsRepository],
  exports: [NotificationRecipientsRepository],
})
export class RepositoriesModule {}
