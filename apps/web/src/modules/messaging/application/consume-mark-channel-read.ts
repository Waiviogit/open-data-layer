const lastMarkedReadAtByChannel = new Map<string, number>();

export function latestMessageCreatedAtUnix(
  items: readonly { created_at_unix: number }[],
): number {
  let max = 0;
  for (const item of items) {
    if (item.created_at_unix > max) {
      max = item.created_at_unix;
    }
  }
  return max;
}

/**
 * Reserves a channel watermark so an RSC remount after `updateTag` does not
 * POST mark-read again. Call {@link releaseMarkChannelRead} if the POST fails.
 */
export function consumeMarkChannelRead(
  channelId: string,
  latestUnix: number,
): boolean {
  if (!channelId || latestUnix <= 0) {
    return false;
  }
  const prev = lastMarkedReadAtByChannel.get(channelId) ?? 0;
  if (prev >= latestUnix) {
    return false;
  }
  lastMarkedReadAtByChannel.set(channelId, latestUnix);
  return true;
}

export function releaseMarkChannelRead(
  channelId: string,
  latestUnix: number,
): void {
  if (lastMarkedReadAtByChannel.get(channelId) === latestUnix) {
    lastMarkedReadAtByChannel.delete(channelId);
  }
}
