import type { HiveEngineTransaction } from '@opden-data-layer/clients';
import { WAIV_TOKEN } from '@opden-data-layer/core';
import {
  WAIV_HE_REWARD_EVENTS,
  WAIV_HE_VOTE_EVENTS,
} from '../../constants/waiv-reward.constants';
import { parseHiveEngineLogs } from './hive-engine-log.util';
import type { WaivEngineRewardEvent, WaivEngineVoteEvent } from './waiv-post-reward.types';

export function parseAuthorPerm(
  authorperm: string,
): { author: string; permlink: string } | null {
  const raw = authorperm.trim();
  const key = raw.startsWith('@') ? raw.slice(1) : raw;
  const slash = key.indexOf('/');
  if (slash <= 0) {
    return null;
  }
  const author = key.slice(0, slash).trim();
  const permlink = key.slice(slash + 1).trim();
  if (author === '' || permlink === '') {
    return null;
  }
  return { author, permlink };
}

export function isPostCashout(cashoutTime: string | null | undefined): boolean {
  const raw = (cashoutTime ?? '').trim();
  if (raw === '') {
    return false;
  }
  const iso = raw.includes('Z') ? raw : `${raw}.000Z`;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return false;
  }
  return ms < Date.now();
}

export function computeNetRsharesWaiv(
  currentNet: number,
  previousRshares: number,
  newRshares: number,
  weight: number,
): number {
  if (weight === 0) {
    return currentNet - previousRshares;
  }
  return currentNet - previousRshares + newRshares;
}

function parseVotePayload(tx: HiveEngineTransaction): Record<string, unknown> {
  try {
    return JSON.parse(tx.payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function extractWaivEventsFromTransactions(
  transactions: HiveEngineTransaction[],
): { votes: WaivEngineVoteEvent[]; rewards: WaivEngineRewardEvent[] } {
  const votes: WaivEngineVoteEvent[] = [];
  const rewards: WaivEngineRewardEvent[] = [];

  for (let trxIndex = 0; trxIndex < transactions.length; trxIndex++) {
    const tx = transactions[trxIndex];
    if (tx.contract !== 'comments') {
      continue;
    }
    const payload = parseVotePayload(tx);
    const author = String(payload.author ?? '').trim();
    const permlink = String(payload.permlink ?? '').trim();
    const voter = String(payload.voter ?? '').trim();
    const weight = Number(payload.weight ?? 0);

    const logEvents = parseHiveEngineLogs(tx);
    for (let logIndex = 0; logIndex < logEvents.length; logIndex++) {
      const ev = logEvents[logIndex];
      const symbol = String(ev.data.symbol ?? '');
      if (symbol !== WAIV_TOKEN.SYMBOL) {
        continue;
      }
      const eventType = ev.event;
      const rshares = parseFloat(String(ev.data.rshares ?? '0'));
      const quantity = parseFloat(String(ev.data.quantity ?? '0'));

      const isVote =
        (eventType === WAIV_HE_VOTE_EVENTS.NEW_VOTE && rshares !== 0) ||
        eventType === WAIV_HE_VOTE_EVENTS.UPDATE_VOTE;
      if (isVote && author && permlink && voter) {
        votes.push({
          author,
          permlink,
          voter,
          weight,
          rshares,
          symbol,
        });
      }

      const isReward = Object.values(WAIV_HE_REWARD_EVENTS).includes(
        eventType as (typeof WAIV_HE_REWARD_EVENTS)[keyof typeof WAIV_HE_REWARD_EVENTS],
      );
      if (isReward && quantity !== 0) {
        const authorperm = String(ev.data.authorperm ?? '').trim();
        const account = String(ev.data.account ?? '').trim();
        if (authorperm) {
          rewards.push({
            heTransactionId: tx.transactionId,
            authorperm,
            quantity,
            symbol,
            event: eventType,
            account,
            refHiveBlockNumber: tx.refHiveBlockNumber,
            trxIndex,
            logIndex,
          });
        }
      }
    }
  }

  return { votes, rewards };
}
