'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useLoginModal } from '@/modules/auth';

import { useLeaveGroupChannel } from '../application/use-leave-group-channel';
import { useUpdateGroupChannel } from '../application/use-update-group-channel';
import { useAddGroupMembers } from '../application/use-add-group-members';
import type { ChannelDetail } from '../domain/messaging.types';
import { loadProfileChannelAboutAction } from '../infrastructure/messaging.actions';
import { applyDraftPeerAvatar } from '../infrastructure/draft-peer-avatar';
import {
  dispatchMessagingChannelUpdated,
  dispatchMessagingChannelLeft,
  dispatchMessagingChannelMembersAdded,
  patchChannelDetail,
  patchChannelDetailMembers,
  subscribeMessagingChannelMembersAdded,
} from '../infrastructure/messaging-channel-sync';
import { EditGroupModal } from './edit-group-modal';
import { LeaveGroupModal } from './leave-group-modal';
import { MESSAGING_CARD_SHELL_CLASS } from './messaging-layout.constants';
import { MessagingChannelAbout } from './messaging-channel-about';
import { MessagingViewportShell } from './messaging-viewport-shell';

export type MessagingProfileAboutRailProps = {
  accountName: string;
  viewerUsername: string | null;
};

export function MessagingProfileAboutRail({
  accountName,
  viewerUsername,
}: MessagingProfileAboutRailProps) {
  const searchParams = useSearchParams();
  const { openLogin } = useLoginModal();
  const channel = searchParams.get('channel');
  const peer = searchParams.get('peer');
  const [detail, setDetail] = useState<ChannelDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnInbox =
    viewerUsername != null &&
    viewerUsername.toLowerCase() === accountName.toLowerCase();

  const { leaveGroupChannel, pending: leavePending } = useLeaveGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: accountName,
    onLeft: (channelId) => {
      setDetail(null);
      dispatchMessagingChannelLeft({ channelId });
    },
  });

  const { updateGroupChannel, pending: updatePending } = useUpdateGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: accountName,
    onUpdated: ({ channelId, title, imageCid }) => {
      const patch = { channelId, title, imageCid };
      setDetail((prev) => (prev ? patchChannelDetail(prev, patch) : prev));
      dispatchMessagingChannelUpdated(patch);
      setEditOpen(false);
    },
  });

  const { addGroupMembers, pending: addMembersPending } = useAddGroupMembers({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: accountName,
    onAdded: ({ channelId, accounts }) => {
      const patch = { channelId, accounts };
      setDetail((prev) => (prev ? patchChannelDetailMembers(prev, patch) : prev));
      dispatchMessagingChannelMembersAdded(patch);
    },
  });

  useEffect(() => {
    return subscribeMessagingChannelMembersAdded((patch) => {
      setDetail((prev) => (prev ? patchChannelDetailMembers(prev, patch) : prev));
    });
  }, []);

  useEffect(() => {
    if (!isOwnInbox) {
      setDetail(null);
      setPending(false);
      return;
    }

    if (!channel && !peer) {
      setDetail(null);
      setPending(false);
      return;
    }

    let cancelled = false;
    setPending(true);
    void loadProfileChannelAboutAction({ channel, peer })
      .then((next) => {
        if (!cancelled) {
          setDetail(next ? applyDraftPeerAvatar(next) : next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channel, isOwnInbox, peer]);

  const handleLeaveConfirm = useCallback(
    async (input: { successorAdmin?: string; deleteMyMessages: boolean }) => {
      if (!detail?.channel_id) {
        return;
      }
      const ok = await leaveGroupChannel({
        channelId: detail.channel_id,
        successorAdmin: input.successorAdmin,
        deleteMyMessages: input.deleteMyMessages,
      });
      if (ok) {
        setLeaveOpen(false);
      }
    },
    [detail?.channel_id, leaveGroupChannel],
  );

  const handleEditSave = useCallback(
    async (input: { title: string; imageCid?: string }) => {
      if (!detail?.channel_id) {
        return;
      }
      await updateGroupChannel({
        channelId: detail.channel_id,
        title: input.title,
        imageCid: input.imageCid,
      });
    },
    [detail?.channel_id, updateGroupChannel],
  );

  if (!isOwnInbox || (!detail && !pending)) {
    return null;
  }

  if (pending && !detail) {
    return (
      <MessagingViewportShell variant="sideRail">
        <aside
          className={[MESSAGING_CARD_SHELL_CLASS, 'p-4'].join(' ')}
          aria-hidden
        >
        <div className="h-6 w-24 animate-pulse rounded-btn bg-surface-control" />
        <div className="mx-auto mt-6 size-[4.5rem] animate-pulse rounded-full bg-surface-control" />
        <div className="mx-auto mt-3 h-4 w-32 animate-pulse rounded-btn bg-surface-control" />
        </aside>
      </MessagingViewportShell>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <>
      <MessagingViewportShell variant="sideRail">
        <div className={MESSAGING_CARD_SHELL_CLASS}>
          <MessagingChannelAbout
            channel={detail}
            variant="rail"
            onEdit={() => setEditOpen(true)}
            onLeave={() => setLeaveOpen(true)}
          />
        </div>
      </MessagingViewportShell>
      <LeaveGroupModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        channel={detail}
        leavePolicy={detail.leave_policy}
        pending={leavePending}
        onConfirm={handleLeaveConfirm}
      />
      <EditGroupModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        channel={detail}
        viewerUsername={viewerUsername}
        pending={updatePending}
        addPending={addMembersPending}
        onSave={handleEditSave}
        onAddMembers={async (accounts) => {
          if (!detail.channel_id) {
            return;
          }
          await addGroupMembers({ channelId: detail.channel_id, accounts });
        }}
      />
    </>
  );
}
