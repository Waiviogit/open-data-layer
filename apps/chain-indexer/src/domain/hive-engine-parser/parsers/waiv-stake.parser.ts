import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  HiveEngineBlock,
  HiveEngineTokensCancelUnstakePayload,
  HiveEngineTokensDelegatePayload,
  HiveEngineTokensLogs,
  HiveEngineTokensStakePayload,
  HiveEngineTransaction,
} from '@opden-data-layer/clients';
import {
  USER_OBJECT_POWERS_UPDATE_EVENT,
  UserObjectPowersUpdateEvent,
} from '../../user-object-powers/user-object-powers.events';
import type { HiveEngineSubParser } from '../hive-engine-sub-parser.interface';

const TOKENS_CONTRACT = 'tokens';
const WAIV_SYMBOL = 'WAIV';
const TRACKED_ACTIONS = new Set([
  'stake',
  'unstake',
  'cancelUnstake',
  'delegate',
  'undelegate',
]);

/**
 * Tracks WAIV stake/delegate operations from Hive Engine `tokens` contract
 * and emits `user_object_powers.update` deltas.
 *
 * @see docs/spec/waiv-power.md
 */
@Injectable()
export class WaivStakeParser implements HiveEngineSubParser {
  private readonly logger = new Logger(WaivStakeParser.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async parseBlock(block: HiveEngineBlock): Promise<void> {
    for (const tx of block.transactions) {
      this.processTransaction(tx);
    }
  }

  private processTransaction(tx: HiveEngineTransaction): void {
    if (tx.contract !== TOKENS_CONTRACT || !TRACKED_ACTIONS.has(tx.action)) {
      return;
    }

    switch (tx.action) {
      case 'stake':
      case 'unstake':
        this.processStakeOrUnstake(tx);
        break;
      case 'cancelUnstake':
        this.processCancelUnstake(tx);
        break;
      case 'delegate':
      case 'undelegate':
        this.processDelegateOrUndelegate(tx);
        break;
      default:
        break;
    }
  }

  private processStakeOrUnstake(tx: HiveEngineTransaction): void {
    const payload = this.parsePayload<HiveEngineTokensStakePayload>(tx);
    if (!payload || payload.symbol !== WAIV_SYMBOL) {
      return;
    }

    const quantity = parseFloat(String(payload.quantity ?? '0'));
    if (!Number.isFinite(quantity) || quantity === 0) {
      return;
    }

    const account = payload.to.trim();
    const delta = tx.action === 'stake' ? quantity : -quantity;
    this.emitDelta(account, delta);
  }

  private processCancelUnstake(tx: HiveEngineTransaction): void {
    const payload = this.parsePayload<HiveEngineTokensCancelUnstakePayload>(tx);
    if (!payload || payload.symbol !== WAIV_SYMBOL) {
      return;
    }

    const fromLogs = this.parseLogEvent(tx, 'unstakeCancel');
    const account = (fromLogs?.account ?? tx.sender).trim();
    const quantity = fromLogs?.quantity;
    if (!account || quantity === undefined || quantity === 0) {
      this.logger.warn(
        `WAIV stake parser: cancelUnstake missing account/quantity in tx ${tx.transactionId}`,
      );
      return;
    }

    this.emitDelta(account, quantity);
  }

  private processDelegateOrUndelegate(tx: HiveEngineTransaction): void {
    const payload = this.parsePayload<HiveEngineTokensDelegatePayload>(tx);
    if (!payload || payload.symbol !== WAIV_SYMBOL) {
      return;
    }

    const quantity = parseFloat(String(payload.quantity ?? '0'));
    if (!Number.isFinite(quantity) || quantity === 0) {
      return;
    }

    const from = tx.sender.trim();
    const to = payload.to.trim();
    if (tx.action === 'delegate') {
      this.emitDelta(from, -quantity);
      this.emitDelta(to, quantity);
      return;
    }
    this.emitDelta(from, quantity);
    this.emitDelta(to, -quantity);
  }

  private parsePayload<T>(tx: HiveEngineTransaction): T | null {
    try {
      return JSON.parse(tx.payload) as T;
    } catch {
      this.logger.warn(`WAIV stake parser: invalid JSON in ${tx.action} payload`);
      return null;
    }
  }

  private parseLogEvent(
    tx: HiveEngineTransaction,
    eventName: string,
  ): { account: string; quantity: number } | null {
    try {
      const logs = JSON.parse(tx.logs) as HiveEngineTokensLogs;
      for (const ev of logs.events ?? []) {
        if (ev.event !== eventName || ev.data.symbol !== WAIV_SYMBOL) {
          continue;
        }
        const account = String(ev.data.account ?? '').trim();
        const quantity = parseFloat(String(ev.data.quantity ?? '0'));
        if (account.length > 0 && Number.isFinite(quantity) && quantity > 0) {
          return { account, quantity };
        }
      }
    } catch {
      this.logger.warn(`WAIV stake parser: invalid logs in ${tx.action} tx ${tx.transactionId}`);
    }
    return null;
  }

  private emitDelta(account: string, delta: number): void {
    const trimmed = account.trim();
    if (trimmed.length === 0 || delta === 0) {
      return;
    }
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent(trimmed, delta),
    );
  }
}
