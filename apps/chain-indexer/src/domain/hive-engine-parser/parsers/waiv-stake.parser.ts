import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { HiveEngineBlock, HiveEngineTransaction } from '@opden-data-layer/clients';
import {
  USER_OBJECT_POWERS_UPDATE_EVENT,
  UserObjectPowersUpdateEvent,
} from '../../user-object-powers/user-object-powers.events';
import type { HiveEngineSubParser } from '../hive-engine-sub-parser.interface';

const TOKENS_CONTRACT = 'tokens';
const TRACKED_ACTIONS = new Set(['stake', 'unstake', 'delegate', 'undelegate']);

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

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(tx.payload) as Record<string, unknown>;
    } catch {
      this.logger.warn(`WAIV stake parser: invalid JSON in ${tx.action} payload`);
      return;
    }

    if (payload.symbol !== 'WAIV') {
      return;
    }

    const quantity = parseFloat(String(payload.quantity ?? '0'));
    if (!Number.isFinite(quantity) || quantity === 0) {
      return;
    }

    switch (tx.action) {
      case 'stake': {
        this.emitDelta(String(payload.account ?? ''), quantity);
        break;
      }
      case 'unstake': {
        this.emitDelta(String(payload.account ?? ''), -quantity);
        break;
      }
      case 'delegate': {
        this.emitDelta(String(payload.from ?? ''), -quantity);
        this.emitDelta(String(payload.to ?? ''), quantity);
        break;
      }
      case 'undelegate': {
        this.emitDelta(String(payload.from ?? ''), quantity);
        this.emitDelta(String(payload.to ?? ''), -quantity);
        break;
      }
      default:
        break;
    }
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
