import {
  ACTIVITY_DEDUP_WINDOW_SEC,
  isNearDuplicate,
  type ActivityFingerprintInput,
} from '@opden-data-layer/core';

export type DedupCandidateRow = {
  message_id: string;
  dup_group_id: string;
  text_simhash: bigint | null;
  image_phashes: bigint[];
  sort_time_unix: number;
  event_seq: bigint;
};

export function resolveDupGroupId(input: {
  messageId: string;
  incoming: ActivityFingerprintInput;
  candidates: readonly DedupCandidateRow[];
}): string {
  if (
    input.incoming.textSimhash == null &&
    input.incoming.imagePhashes.length === 0
  ) {
    return input.messageId;
  }

  const inWindow = input.candidates.filter(
    (c) => Math.abs(c.sort_time_unix - input.incoming.sourceTimeUnix) <= ACTIVITY_DEDUP_WINDOW_SEC,
  );

  let best: DedupCandidateRow | null = null;
  for (const candidate of inWindow) {
    const match = isNearDuplicate(input.incoming, {
      fingerprintV: input.incoming.fingerprintV,
      textSimhash: candidate.text_simhash,
      imagePhashes: candidate.image_phashes,
      sourceTimeUnix: candidate.sort_time_unix,
    });
    if (match == null) {
      continue;
    }
    if (
      best == null ||
      candidate.event_seq < best.event_seq ||
      (candidate.event_seq === best.event_seq && candidate.message_id < best.message_id)
    ) {
      best = candidate;
    }
  }

  return best?.dup_group_id ?? input.messageId;
}
