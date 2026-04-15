import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CustomJsonOperation } from '@hiveio/dhive/lib/chain/operation';
import { HIVE_CUSTOM_JSON_ID } from '../../constants/hive-parser';
import { OdlCustomJsonParser } from '../odl-parser/odl-custom-json-parser';
import { FollowSocialService } from '../hive-social/follow-social.service';
import type { HiveOperationHandlerContext } from './hive-handler-context';

type CustomJsonIdHandler = (
  payload: CustomJsonOperation[1],
  context: HiveOperationHandlerContext,
) => Promise<void>;

@Injectable()
export class HiveCustomJsonParser {
  private readonly logger = new Logger(HiveCustomJsonParser.name);
  private readonly handlers: Record<string, CustomJsonIdHandler>;

  constructor(
    private readonly odlParser: OdlCustomJsonParser,
    private readonly configService: ConfigService,
    private readonly followSocial: FollowSocialService,
  ) {
    const odlId = this.configService.get<string>('hive.odlCustomJsonId');

    const handleOdl: CustomJsonIdHandler = (payload, context) => {
      const account =
        payload.required_posting_auths[0] ?? payload.required_auths[0] ?? '';
      return this.odlParser.parse(payload.json, account, context);
    };

    const handleFollow: CustomJsonIdHandler = (payload, context) =>
      this.followSocial.handleFollowCustomJson(payload, context);

    this.handlers = {
      [odlId]: handleOdl,
      [HIVE_CUSTOM_JSON_ID.FOLLOW]: handleFollow,
    };
  }

  async parse(
    payload: CustomJsonOperation[1],
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    const handler = this.handlers[payload.id];
    if (!handler) return;
    await handler(payload, context);
  }
}
