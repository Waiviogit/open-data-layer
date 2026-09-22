import type { ChannelDetail } from '../domain/messaging.types';

/** Search `profile_image` for a DM that has no channel row yet. */
const draftPeerAvatars = new Map<string, string | null>();

function peerKey(peer: string): string {
  return peer.trim().toLowerCase();
}

export function rememberDraftPeerAvatar(peer: string, avatarUrl: string | null): void {
  const key = peerKey(peer);
  if (!key) {
    return;
  }
  draftPeerAvatars.set(key, avatarUrl);
}

export function draftPeerAvatar(peer: string): string | null | undefined {
  const key = peerKey(peer);
  if (!key || !draftPeerAvatars.has(key)) {
    return undefined;
  }
  return draftPeerAvatars.get(key);
}

/** Stamp a search avatar onto a pre-channel DM. Leaves a URL the channel API already set. */
export function applyDraftPeerAvatar(detail: ChannelDetail): ChannelDetail {
  if (detail.kind !== 'direct' || !detail.peer) {
    return detail;
  }
  const draft = draftPeerAvatar(detail.peer);
  if (draft === undefined) {
    return detail;
  }
  const peer = detail.peer.toLowerCase();
  return {
    ...detail,
    members: detail.members.map((member) => {
      if (member.account.toLowerCase() !== peer || member.avatar_url) {
        return member;
      }
      return { ...member, avatar_url: draft };
    }),
  };
}

/** @internal */
export function resetDraftPeerAvatarsForTests(): void {
  draftPeerAvatars.clear();
}
