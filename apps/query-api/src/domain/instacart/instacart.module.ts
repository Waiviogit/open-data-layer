import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { AffiliateModule } from '../affiliate';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { OpenAiModule } from '../openai';
import { GetInstacartRecipeLinkEndpoint } from './get-instacart-recipe-link.endpoint';
import { InstacartIdpClient } from './instacart-idp.client';

@Module({
  imports: [
    RepositoriesModule,
    ObjectsDomainModule,
    GovernanceModule,
    ObjectProjectionModule,
    AffiliateModule,
    OpenAiModule,
  ],
  providers: [InstacartIdpClient, GetInstacartRecipeLinkEndpoint],
  exports: [GetInstacartRecipeLinkEndpoint],
})
export class InstacartModule {}
