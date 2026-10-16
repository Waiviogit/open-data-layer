let lastMarkedKey: string | null = null;

/**
 * True when this account+tab has not just been marked. Same key after an
 * `updateTag` remount is skipped; navigating to another tab (or away and back)
 * marks again.
 */
export function consumeMarkProfileFeedRead(
  accountName: string,
  tab: string,
): boolean {
  const account = accountName.trim().toLowerCase();
  const feedTab = tab.trim();
  if (!account || !feedTab) {
    return false;
  }
  const key = `${account}:${feedTab}`;
  if (lastMarkedKey === key) {
    return false;
  }
  lastMarkedKey = key;
  return true;
}
