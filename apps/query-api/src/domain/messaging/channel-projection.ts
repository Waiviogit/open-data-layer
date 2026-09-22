import type { ChannelMember } from '@opden-data-layer/odl-db-types';

export type ChannelMemberView = {
  account: string;
  role: 'admin' | 'member';
  avatar_url: string | null;
};

export type ChannelLeavePolicy = {
  can_leave: boolean;
  requires_successor: boolean;
  eligible_successors: string[];
};

export function buildDmListTitle(members: readonly string[]): string {
  return [...members].sort((a, b) => a.localeCompare(b)).join(' & ');
}

export function buildDmPeer(
  members: readonly string[],
  viewer: string,
): string | null {
  const peer = members.find((m) => m !== viewer);
  return peer ?? null;
}

export function memberAccounts(members: ChannelMember[]): string[] {
  return members.map((m) => m.account);
}

export function mapMembersWithRoles(
  members: ChannelMember[],
  avatarUrls?: ReadonlyMap<string, string | null>,
): ChannelMemberView[] {
  return members.map((member) => ({
    account: member.account,
    role: member.role === 'admin' ? 'admin' : 'member',
    avatar_url: avatarUrls?.get(member.account) ?? null,
  }));
}

export function buildLeavePolicy(
  members: ChannelMember[],
  viewer: string,
): ChannelLeavePolicy {
  const viewerMember = members.find((member) => member.account === viewer);
  if (!viewerMember) {
    return {
      can_leave: false,
      requires_successor: false,
      eligible_successors: [],
    };
  }

  const adminCount = members.filter((member) => member.role === 'admin').length;
  const memberCount = members.length;
  const isSoleAdmin = viewerMember.role === 'admin' && adminCount === 1;
  const requiresSuccessor = isSoleAdmin && memberCount > 1;
  const eligibleSuccessors = requiresSuccessor
    ? members
        .map((member) => member.account)
        .filter((account) => account !== viewer)
        .sort((a, b) => a.localeCompare(b))
    : [];

  return {
    can_leave: true,
    requires_successor: requiresSuccessor,
    eligible_successors: eligibleSuccessors,
  };
}
