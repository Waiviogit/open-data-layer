import { Injectable } from '@nestjs/common';

import { AccountsCurrentRepository } from '../../repositories';
import { EngineWithdrawQuoteService } from './engine-swap/engine-withdraw-quote.service';
import type {
  EngineWithdrawQuoteBody,
  EngineWithdrawQuoteResponse,
} from './schemas/engine-swap.schema';

@Injectable()
export class PostUserEngineWithdrawQuoteEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly withdrawQuote: EngineWithdrawQuoteService,
  ) {}

  async execute(
    profileAccountName: string,
    body: EngineWithdrawQuoteBody,
  ): Promise<EngineWithdrawQuoteResponse | null> {
    const accountRow = await this.accounts.findByName(profileAccountName);
    if (!accountRow) {
      return null;
    }

    const result = await this.withdrawQuote.quote({
      account: profileAccountName,
      quantity: body.quantity,
      inputSymbol: body.inputSymbol,
      outputSymbol: body.outputSymbol,
      address: body.address,
      previewOnly: body.previewOnly,
    });

    return {
      predictiveAmount: result.predictiveAmount,
      customJsonPayload: result.customJsonPayload as Record<string, unknown>[],
      error: result.error,
      errorCode: result.errorCode,
      errorParams: result.errorParams,
    };
  }
}
