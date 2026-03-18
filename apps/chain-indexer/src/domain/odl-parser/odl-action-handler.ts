/** Context passed to every ODL action handler. */
export interface OdlEventContext {
  /** The action string from the event, e.g. 'object_create'. */
  action: string;
  /** Posting_auth or required_auth Hive account that submitted the custom_json. */
  creator: string;
  blockNum: number;
  transactionIndex: number;
  operationIndex: number;
  /** Zero-based index of this event within the envelope events[] array. */
  odlEventIndex: number;
  transactionId: string;
  timestamp: string;
  /** Packed canonical order bigint for DB storage; computed via encodeEventSeq. */
  eventSeq: bigint;
}

/** Common interface for all ODL action handlers. */
export interface OdlActionHandler {
  /** Action string this handler is responsible for, e.g. 'object_create'. */
  readonly action: string;
  handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void>;
}
