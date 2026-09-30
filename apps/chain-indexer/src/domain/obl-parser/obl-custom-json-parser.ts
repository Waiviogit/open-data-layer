import { Injectable, Logger } from '@nestjs/common';
import { encodeEventSeq } from '@opden-data-layer/core';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import { dispatchEnvelope } from '../odl-shared';
import type { OdlActionHandler } from '../odl-shared';
import { GovernanceCacheService } from '../governance/governance-cache.service';
import { oblEnvelopeSchema } from './obl-envelope.schema';
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
import { ServiceOrderCancelHandler } from './handlers/service-order-cancel.handler';
import { ReportCreateHandler } from './handlers/report-create.handler';

@Injectable()
export class OblCustomJsonParser {
  private readonly logger = new Logger(OblCustomJsonParser.name);
  private readonly handlerMap: Record<string, OdlActionHandler>;

  constructor(
    private readonly offerPublishHandler: OfferPublishHandler,
    private readonly offerUpdateHandler: OfferUpdateHandler,
    private readonly offerRetireHandler: OfferRetireHandler,
    private readonly contractSignHandler: ContractSignHandler,
    private readonly invoiceIssueHandler: InvoiceIssueHandler,
    private readonly paymentDeclareHandler: PaymentDeclareHandler,
    private readonly paymentConfirmHandler: PaymentConfirmHandler,
    private readonly disputeOpenHandler: DisputeOpenHandler,
    private readonly disputeResolveHandler: DisputeResolveHandler,
    private readonly serviceOrderCreateHandler: ServiceOrderCreateHandler,
    private readonly serviceOrderCancelHandler: ServiceOrderCancelHandler,
    private readonly reportCreateHandler: ReportCreateHandler,
    private readonly governanceCache: GovernanceCacheService,
  ) {
    this.handlerMap = {
      [this.offerPublishHandler.action]: this.offerPublishHandler,
      [this.offerUpdateHandler.action]: this.offerUpdateHandler,
      [this.offerRetireHandler.action]: this.offerRetireHandler,
      [this.contractSignHandler.action]: this.contractSignHandler,
      [this.invoiceIssueHandler.action]: this.invoiceIssueHandler,
      [this.paymentDeclareHandler.action]: this.paymentDeclareHandler,
      [this.paymentConfirmHandler.action]: this.paymentConfirmHandler,
      [this.disputeOpenHandler.action]: this.disputeOpenHandler,
      [this.disputeResolveHandler.action]: this.disputeResolveHandler,
      [this.serviceOrderCreateHandler.action]: this.serviceOrderCreateHandler,
      [this.serviceOrderCancelHandler.action]: this.serviceOrderCancelHandler,
      [this.reportCreateHandler.action]: this.reportCreateHandler,
    };
  }

  async parse(
    rawJson: string,
    account: string,
    hiveCtx: HiveOperationHandlerContext,
  ): Promise<void> {
    await dispatchEnvelope(rawJson, {
      schema: oblEnvelopeSchema,
      handlerMap: this.handlerMap,
      governanceCache: this.governanceCache,
      logger: this.logger,
      encodeEventSeq,
      hiveCtx,
      account,
      unknownActionLabel: 'OBL: unknown action',
    });
  }
}
