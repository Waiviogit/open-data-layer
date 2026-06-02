import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserObjectPowersRepository } from '../../repositories';
import {
  USER_OBJECT_POWERS_UPDATE_EVENT,
  UserObjectPowersUpdateEvent,
} from './user-object-powers.events';

@Injectable()
export class UserObjectPowersUpdateListener {
  private readonly logger = new Logger(UserObjectPowersUpdateListener.name);

  constructor(private readonly repo: UserObjectPowersRepository) {}

  @OnEvent(USER_OBJECT_POWERS_UPDATE_EVENT)
  async handle(event: UserObjectPowersUpdateEvent): Promise<void> {
    try {
      const trimmed = event.account.trim();
      if (trimmed.length === 0 || event.delta === 0) {
        return;
      }
      const row = await this.repo.findByAccount(trimmed);
      if (!row) {
        return;
      }
      await this.repo.setRawWaivPowerDelta(trimmed, event.delta);
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }
}
