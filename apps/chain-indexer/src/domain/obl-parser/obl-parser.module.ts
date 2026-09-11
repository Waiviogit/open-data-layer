import { Module } from '@nestjs/common';
import { GovernanceModule } from '../governance/governance.module';
import { NotificationAdapterModule } from '../notification-adapter/notification-adapter.module';
import { RepositoriesModule } from '../../repositories';
import { OblCustomJsonParser } from './obl-custom-json-parser';
import { OblNotificationService } from './obl-notification.service';
import { OfferPublishHandler } from './handlers/offer-publish.handler';
import { OfferUpdateHandler } from './handlers/offer-update.handler';
import { OfferRetireHandler } from './handlers/offer-retire.handler';
import { ContractSignHandler } from './handlers/contract-sign.handler';
import { InvoiceIssueHandler } from './handlers/invoice-issue.handler';
import { PaymentDeclareHandler } from './handlers/payment-declare.handler';
import { PaymentConfirmHandler } from './handlers/payment-confirm.handler';
import { DisputeOpenHandler } from './handlers/dispute-open.handler';
import { DisputeResolveHandler } from './handlers/dispute-resolve.handler';
import { ServiceOrderCreateHandler } from './handlers/service-order-create.handler';
import { ReportCreateHandler } from './handlers/report-create.handler';
import { OblUsdRatesService } from './obl-usd-rates.service';
import { OblPaymentAttributionService } from './obl-payment-attribution.service';

@Module({
  imports: [RepositoriesModule, GovernanceModule, NotificationAdapterModule],
  providers: [
    OblCustomJsonParser,
    OblUsdRatesService,
    OblPaymentAttributionService,
    OblNotificationService,
    OfferPublishHandler,
    OfferUpdateHandler,
    OfferRetireHandler,
    ContractSignHandler,
    InvoiceIssueHandler,
    PaymentDeclareHandler,
    PaymentConfirmHandler,
    DisputeOpenHandler,
    DisputeResolveHandler,
    ServiceOrderCreateHandler,
    ReportCreateHandler,
  ],
  exports: [OblCustomJsonParser, OblPaymentAttributionService],
})
export class OblParserModule {}
