import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserObjectPowersEnsureService } from './user-object-powers-ensure.service';
import {
  USER_OBJECT_POWERS_CREATE_EVENT,
  UserObjectPowersCreateEvent,
} from './user-object-powers.events';

@Injectable()
export class UserObjectPowersCreateListener {
  private readonly logger = new Logger(UserObjectPowersCreateListener.name);

  constructor(private readonly ensureService: UserObjectPowersEnsureService) {}

  @OnEvent(USER_OBJECT_POWERS_CREATE_EVENT)
  async handle(event: UserObjectPowersCreateEvent): Promise<void> {
    try {
      await this.ensureService.ensure(event.account);
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }
}
