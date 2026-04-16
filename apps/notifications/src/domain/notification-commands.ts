export interface SubscribeCommand {
  trxId: string;
  correlationId: string;
}

export interface UnsubscribeCommand {
  trxId: string;
  correlationId: string;
}
