import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { GovernanceModule } from '../governance';
import { GetChannelsEndpoint } from './get-channels.endpoint';
import { GetChannelByIdEndpoint } from './get-channel-by-id.endpoint';
import { GetChannelByAliasEndpoint } from './get-channel-by-alias.endpoint';
import { GetChannelMessagesEndpoint } from './get-channel-messages.endpoint';
import {
  GetObjectChannelEndpoint,
  GetObjectChannelMessagesEndpoint,
} from './get-object-channel.endpoint';
import { MarkChannelReadEndpoint } from './mark-channel-read.endpoint';
import {
  ValidateChannelMembersEndpoint,
  ValidateGroupInviteesEndpoint,
} from './validate-members.endpoint';
import { GetMemoPublicKeyEndpoint } from './get-memo-public-key.endpoint';
import { CheckActivityDuplicateEndpoint } from './check-activity-duplicate.endpoint';

@Module({
  imports: [RepositoriesModule, GovernanceModule],
  providers: [
    GetChannelsEndpoint,
    GetChannelByIdEndpoint,
    GetChannelByAliasEndpoint,
    GetChannelMessagesEndpoint,
    GetObjectChannelEndpoint,
    GetObjectChannelMessagesEndpoint,
    CheckActivityDuplicateEndpoint,
    MarkChannelReadEndpoint,
    ValidateChannelMembersEndpoint,
    ValidateGroupInviteesEndpoint,
    GetMemoPublicKeyEndpoint,
  ],
  exports: [
    GetChannelsEndpoint,
    GetChannelByIdEndpoint,
    GetChannelByAliasEndpoint,
    GetChannelMessagesEndpoint,
    GetObjectChannelEndpoint,
    GetObjectChannelMessagesEndpoint,
    CheckActivityDuplicateEndpoint,
    MarkChannelReadEndpoint,
    ValidateChannelMembersEndpoint,
    ValidateGroupInviteesEndpoint,
    GetMemoPublicKeyEndpoint,
  ],
})
export class MessagingModule {}
