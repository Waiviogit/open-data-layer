import { getSegmentsAfterAccount } from './profile-path';

export type UserMenuSubmenuVariant =
  | 'feed'
  | 'wallet'
  | 'followers'
  | 'expertise'
  | null;

const FEED_SUBSEGMENTS = new Set(['threads', 'comments', 'mentions', 'activity']);

export function isFeedSectionActive(rest: string[]): boolean {
  if (rest.length === 0) {
    return true;
  }
  return FEED_SUBSEGMENTS.has(rest[0] ?? '');
}

/** Resolves active wallet tab from `?type=`; defaults to WAIV when missing. */
export function getWalletTypeFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  const raw = params.get('type');
  if (!raw) {
    return 'WAIV';
  }
  const upper = raw.toUpperCase();
  if (upper === 'WAIV' || upper === 'HIVE' || upper === 'ENGINE') {
    return upper;
  }
  if (raw.toLowerCase() === 'rebalancing') {
    return 'rebalancing';
  }
  return 'WAIV';
}

/** Which secondary nav row to show for the current path (for skeleton / layout). */
export function getSubmenuVariant(pathname: string): UserMenuSubmenuVariant {
  if (!pathname) {
    return null;
  }
  const rest = getSegmentsAfterAccount(pathname);
  const head = rest[0] ?? '';
  if (isFeedSectionActive(rest)) {
    return 'feed';
  }
  if (head === 'transfers') {
    return 'wallet';
  }
  if (
    head === 'followers' ||
    head === 'following' ||
    head === 'following-objects'
  ) {
    return 'followers';
  }
  if (head === 'expertise-hashtags' || head === 'expertise-objects') {
    return 'expertise';
  }
  return null;
}
