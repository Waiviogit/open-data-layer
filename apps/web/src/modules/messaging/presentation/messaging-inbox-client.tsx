'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useLoginModal } from '@/modules/auth';
import { UserAvatar } from '@/shared/presentation';

import { useSendMessage } from '../application/use-send-message';
import { useSendEncryptedMessage } from '../application/use-send-encrypted-message';
import { useUpdateMessage } from '../application/use-update-message';
import { useDeleteMessage } from '../application/use-delete-message';
import { useViewerFollowingSet } from '../application/use-viewer-following-set';
import { useCreateGroupChannel } from '../application/use-create-group-channel';
import { useLeaveGroupChannel } from '../application/use-leave-group-channel';
import { useUpdateGroupChannel } from '../application/use-update-group-channel';
import { useAddGroupMembers } from '../application/use-add-group-members';
import {
  buildOptimisticGroupChannelDetail,
  buildOptimisticGroupChannelListItem,
  mergeChannelListItems,
  buildReplyQuoteJson,
} from '../domain/messaging.helpers';
import {
  buildGroupChannelHref,
  resolveStartChatAction,
} from '../application/messaging-start-chat';
import type {
  ChannelDetail,
  ChannelListPage,
  MessageHistoryPage,
  MessageItem,
  MessagingComposeIntent,
  SendEncryptedMessageInput,
} from '../domain/messaging.types';
import { EMPTY_LEAVE_POLICY } from '../domain/messaging.types';
import {
  loadOlderChannelMessagesAction,
  markChannelReadAction,
} from '../infrastructure/messaging.actions';
import {
  buildMessagesHref,
  dispatchMessagingChannelUpdated,
  dispatchMessagingChannelLeft,
  dispatchMessagingChannelMembersAdded,
  mergeViewerChannels,
  patchChannelDetail,
  patchChannelDetailMembers,
  patchChannelListItem,
  pickNextChannelAfterLeave,
  subscribeMessagingChannelUpdated,
  subscribeMessagingChannelLeft,
  subscribeMessagingChannelMembersAdded,
} from '../infrastructure/messaging-channel-sync';
import { MessagingChannelAbout } from './messaging-channel-about';
import { MessagingChannelList } from './messaging-channel-list';
import { MessagingComposeBar } from './messaging-compose-bar';
import { MessagingLayout } from './messaging-layout';
import { MessagingMessageList } from './messaging-message-list';
import { EditGroupModal } from './edit-group-modal';
import { LeaveGroupModal } from './leave-group-modal';
import { NewMessageModal } from './new-message-modal';

/** Stay pinned when the user is already this close to the latest message. */
const MESSAGE_LIST_NEAR_BOTTOM_PX = 80;

export type MessagingInboxClientProps = {
  viewerUsername: string;
  accountName: string;
  initialChannels: ChannelListPage;
  initialChannelId: string | null;
  initialPeer: string | null;
  initialMessages: MessageHistoryPage;
  initialChannelDetail: ChannelDetail | null;
  /** Desktop: channel list renders in profile left column (@leftSidebar). */
  listInLeftRail?: boolean;
};

export function MessagingInboxClient({
  viewerUsername,
  accountName,
  initialChannels,
  initialChannelId,
  initialPeer,
  initialMessages,
  initialChannelDetail,
  listInLeftRail = true,
}: MessagingInboxClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { openLogin } = useLoginModal();
  const followingSet = useViewerFollowingSet(viewerUsername);
  const [channels, setChannels] = useState(initialChannels.items);
  const [activeChannelId, setActiveChannelId] = useState(initialChannelId);
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages.items);
  const [messagesCursor, setMessagesCursor] = useState(initialMessages.cursor);
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.hasMore);
  const [channelDetail, setChannelDetail] = useState<ChannelDetail | null>(
    initialChannelDetail,
  );
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(() =>
    initialChannelId || initialPeer ? 'chat' : 'list',
  );
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingPeer, setPendingPeer] = useState<string | null>(initialPeer);
  const [loadingOlder, startOlderTransition] = useTransition();
  const [composeIntent, setComposeIntent] = useState<MessagingComposeIntent>(null);
  const [composeEditorKey, setComposeEditorKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const olderAnchorRef = useRef<{ height: number; top: number } | null>(null);
  const pinnedChannelRef = useRef<string | null>(null);
  const listMetricsRef = useRef<{ channelId: string | null; scrollHeight: number } | null>(null);

  const refreshAfterSend = useCallback(() => {
    router.refresh();
  }, [router]);

  const { sendMessage, pending } = useSendMessage({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onSent: refreshAfterSend,
  });

  const { sendEncryptedMessage, pendingEncrypted } = useSendEncryptedMessage({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    markReadChannelId: activeChannelId,
    onSent: refreshAfterSend,
  });

  const { updateMessage, pending: messageUpdatePending } = useUpdateMessage({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onUpdated: ({ messageId, body, updatedAtUnix }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.message_id === messageId
            ? { ...message, body, updated_at_unix: updatedAtUnix }
            : message,
        ),
      );
    },
  });

  const { deleteMessage } = useDeleteMessage({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onDeleted: (messageId) => {
      setMessages((prev) => prev.filter((message) => message.message_id !== messageId));
    },
  });

  const { createGroupChannel, pending: groupCreatePending } = useCreateGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
  });

  const { leaveGroupChannel, pending: leavePending } = useLeaveGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onLeft: (channelId) => {
      dispatchMessagingChannelLeft({ channelId });
    },
  });

  const { updateGroupChannel, pending: updatePending } = useUpdateGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onUpdated: ({ channelId, title, imageCid }) => {
      const patch = { channelId, title, imageCid };
      setChannelDetail((prev) => (prev ? patchChannelDetail(prev, patch) : prev));
      setChannels((prev) => prev.map((item) => patchChannelListItem(item, patch)));
      dispatchMessagingChannelUpdated(patch);
      setEditOpen(false);
    },
  });

  const { addGroupMembers, pending: addMembersPending } = useAddGroupMembers({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
    onAdded: ({ channelId, accounts }) => {
      const patch = { channelId, accounts };
      setChannelDetail((prev) =>
        prev ? patchChannelDetailMembers(prev, patch) : prev,
      );
      dispatchMessagingChannelMembersAdded(patch);
    },
  });

  const handleStartChat = useCallback(
    async (input: { peers: string[]; title?: string }) => {
      const action = await resolveStartChatAction(accountName, viewerUsername, input);
      if (action.kind === 'noop') {
        return;
      }
      if (action.kind === 'dm') {
        router.push(action.href);
        setNewMessageOpen(false);
        return;
      }
      const channelId = await createGroupChannel({
        members: action.members,
        title: action.title,
      });
      if (!channelId) {
        return;
      }
      const optimisticListItem = buildOptimisticGroupChannelListItem({
        channelId,
        members: action.members,
        viewerUsername,
        title: action.title,
      });
      const optimisticDetail = buildOptimisticGroupChannelDetail({
        channelId,
        members: action.members,
        viewerUsername,
        title: action.title,
      });
      setChannels((prev) => mergeChannelListItems([optimisticListItem], prev));
      setActiveChannelId(channelId);
      setChannelDetail(optimisticDetail);
      setPendingPeer(null);
      setMessages([]);
      setMessagesCursor(null);
      setHasMoreMessages(false);
      setMobileView('chat');
      router.push(buildGroupChannelHref(accountName, channelId));
      router.refresh();
      setNewMessageOpen(false);
    },
    [accountName, createGroupChannel, router, viewerUsername],
  );

  useEffect(() => {
    setChannels((prev) => mergeViewerChannels(initialChannels.items, prev));
  }, [initialChannels.items]);

  useEffect(() => {
    setPendingPeer(initialPeer);
    if (initialPeer) {
      setMobileView('chat');
      setChannelDetail({
        channel_id: '',
        kind: 'direct',
        creator: viewerUsername,
        title: null,
        image: null,
        object_id: null,
        access: 'members_only',
        display_title: initialPeer,
        list_title: null,
        peer: initialPeer,
        members: [
          { account: viewerUsername, role: 'member' },
          { account: initialPeer, role: 'member' },
        ],
        viewer_role: null,
        leave_policy: EMPTY_LEAVE_POLICY,
      });
    }
  }, [initialPeer, viewerUsername]);

  useEffect(() => {
    setMessages(initialMessages.items);
    setMessagesCursor(initialMessages.cursor);
    setHasMoreMessages(initialMessages.hasMore);
    if (initialChannelId) {
      setActiveChannelId(initialChannelId);
      setChannelDetail(initialChannelDetail);
      setPendingPeer(null);
      setMobileView('chat');
    } else if (!initialPeer) {
      setActiveChannelId(null);
      setChannelDetail(null);
      setMobileView('list');
    }
  }, [
    initialChannelDetail,
    initialChannelId,
    initialMessages.cursor,
    initialMessages.hasMore,
    initialMessages.items,
    initialPeer,
  ]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) {
      pinnedChannelRef.current = null;
      listMetricsRef.current = null;
      return;
    }

    const anchor = olderAnchorRef.current;
    if (anchor) {
      const delta = el.scrollHeight - anchor.height;
      if (delta !== 0) {
        el.scrollTop = anchor.top + delta;
      }
      if (loadingOlder) {
        olderAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      } else {
        olderAnchorRef.current = null;
      }
      listMetricsRef.current = { channelId: activeChannelId, scrollHeight: el.scrollHeight };
      return;
    }

    const messagesMatchChannel =
      messages.length === 0 ||
      !activeChannelId ||
      messages.every((message) => message.channel_id === activeChannelId);
    const prev = listMetricsRef.current;
    const heightGrowth =
      prev == null ? 0 : Math.max(0, el.scrollHeight - prev.scrollHeight);
    const distanceBeforeGrowth =
      el.scrollHeight - el.scrollTop - el.clientHeight - heightGrowth;
    const wasNearBottom = distanceBeforeGrowth <= MESSAGE_LIST_NEAR_BOTTOM_PX;
    const shouldInitialPin =
      messagesMatchChannel &&
      messages.length > 0 &&
      pinnedChannelRef.current !== activeChannelId;
    const shouldStick =
      messagesMatchChannel &&
      wasNearBottom &&
      pinnedChannelRef.current === activeChannelId;

    if (shouldInitialPin || shouldStick) {
      el.scrollTop = el.scrollHeight;
    }
    if (shouldInitialPin && activeChannelId) {
      pinnedChannelRef.current = activeChannelId;
    }

    listMetricsRef.current = { channelId: activeChannelId, scrollHeight: el.scrollHeight };
  }, [activeChannelId, loadingOlder, messages]);

  const markReadForMessages = useCallback(
    async (items: MessageItem[]) => {
      if (!activeChannelId || items.length === 0) {
        return;
      }
      const latest = items.reduce(
        (max, item) => (item.created_at_unix > max ? item.created_at_unix : max),
        items[0]?.created_at_unix ?? 0,
      );
      if (latest > 0) {
        await markChannelReadAction(activeChannelId, latest);
      }
    },
    [activeChannelId],
  );

  useEffect(() => {
    if (initialMessages.items.length > 0 && activeChannelId) {
      void markReadForMessages(initialMessages.items);
    }
  }, [activeChannelId, initialMessages.items, markReadForMessages]);

  useEffect(() => {
    return subscribeMessagingChannelUpdated((patch) => {
      setChannelDetail((prev) => (prev ? patchChannelDetail(prev, patch) : prev));
      setChannels((prev) => prev.map((item) => patchChannelListItem(item, patch)));
    });
  }, []);

  useEffect(() => {
    return subscribeMessagingChannelLeft(({ channelId }) => {
      setLeaveOpen(false);
      setChannels((prev) => {
        const remaining = prev.filter((item) => item.channel_id !== channelId);
        const nextChannelId = pickNextChannelAfterLeave(prev, channelId);
        router.replace(buildMessagesHref(accountName, nextChannelId));
        return remaining;
      });
      setActiveChannelId(null);
      setChannelDetail(null);
      setMessages([]);
      setMessagesCursor(null);
      setHasMoreMessages(false);
      setMobileView('list');
    });
  }, [accountName, router]);

  useEffect(() => {
    return subscribeMessagingChannelMembersAdded((patch) => {
      setChannelDetail((prev) =>
        prev ? patchChannelDetailMembers(prev, patch) : prev,
      );
    });
  }, []);

  const selectChannel = useCallback(
    (channelId: string) => {
      setActiveChannelId(channelId);
      setPendingPeer(null);
      setMobileView('chat');
      const params = new URLSearchParams();
      params.set('channel', channelId);
      router.push(`/@${accountName}/messages?${params.toString()}`);
    },
    [accountName, router],
  );

  const mobileList = (
    <MessagingChannelList
      channels={channels}
      activeChannelId={activeChannelId}
      onSelectChannel={selectChannel}
      onNewMessage={() => setNewMessageOpen(true)}
      followingSet={followingSet}
      viewerUsername={viewerUsername}
    />
  );

  const activeChannel =
    channels.find((channel) => channel.channel_id === activeChannelId) ?? null;
  const hasPriorMessages =
    messages.length > 0 || (activeChannel?.last_message_at_unix ?? null) != null;

  const loadOlder = useCallback(() => {
    if (!activeChannelId || !messagesCursor || loadingOlder) {
      return;
    }
    const el = listRef.current;
    if (el) {
      olderAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    }
    startOlderTransition(async () => {
      const page = await loadOlderChannelMessagesAction(activeChannelId, messagesCursor);
      setMessages((prev) => [...page.items, ...prev]);
      setMessagesCursor(page.cursor);
      setHasMoreMessages(page.hasMore);
    });
  }, [activeChannelId, loadingOlder, messagesCursor]);

  useEffect(() => {
    const node = topSentinelRef.current;
    const root = listRef.current;
    if (!node || !root || !hasMoreMessages) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadOlder();
        }
      },
      { root, rootMargin: '100px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreMessages, loadOlder]);

  const chatTitle =
    channelDetail?.display_title ??
    activeChannel?.display_title ??
    t('messaging_select_chat');

  const onSendPlain = useCallback(
    async (body: string): Promise<boolean> => {
      if (composeIntent?.mode === 'edit') {
        if (!activeChannelId) {
          return false;
        }
        const ok = await updateMessage({
          channelId: activeChannelId,
          messageId: composeIntent.message.message_id,
          body,
        });
        if (ok) {
          setComposeIntent(null);
          setComposeEditorKey((key) => key + 1);
        }
        return ok;
      }

      const reply =
        composeIntent?.mode === 'reply'
          ? {
              replyTo: composeIntent.message.message_id,
              quoteJson: buildReplyQuoteJson(composeIntent.message),
            }
          : undefined;

      if (pendingPeer) {
        const ok = await sendMessage({ peer: pendingPeer }, body, reply);
        if (ok) {
          setPendingPeer(null);
          setComposeIntent(null);
          setComposeEditorKey((key) => key + 1);
        }
        return ok;
      }
      if (!activeChannelId) {
        return false;
      }
      const ok = await sendMessage({ channelId: activeChannelId }, body, reply);
      if (ok) {
        setComposeIntent(null);
        setComposeEditorKey((key) => key + 1);
      }
      return ok;
    },
    [
      activeChannelId,
      composeIntent,
      pendingPeer,
      sendMessage,
      updateMessage,
    ],
  );

  const handleReply = useCallback((message: MessageItem) => {
    setComposeIntent({ mode: 'reply', message });
    setComposeEditorKey((key) => key + 1);
  }, []);

  const handleEdit = useCallback((message: MessageItem) => {
    setComposeIntent({ mode: 'edit', message });
    setComposeEditorKey((key) => key + 1);
  }, []);

  const handleDelete = useCallback(
    async (message: MessageItem) => {
      if (!activeChannelId) {
        return;
      }
      await deleteMessage({
        channelId: activeChannelId,
        messageId: message.message_id,
      });
    },
    [activeChannelId, deleteMessage],
  );

  const onSendEncrypted = useCallback(
    async (input: SendEncryptedMessageInput) => {
      if (pendingPeer) {
        return sendEncryptedMessage({ peer: pendingPeer }, input);
      }
      if (!activeChannelId) {
        return false;
      }
      return sendEncryptedMessage({ channelId: activeChannelId }, input);
    },
    [activeChannelId, pendingPeer, sendEncryptedMessage],
  );

  const composeChannelKind: 'direct' | 'group' | 'object' =
    channelDetail?.kind === 'group'
      ? 'group'
      : channelDetail?.kind === 'object'
        ? 'object'
        : 'direct';

  const composeMembers =
    channelDetail?.members.map((member) => member.account) ??
    activeChannel?.members ??
    [];

  const composePeer = pendingPeer ?? channelDetail?.peer ?? activeChannel?.peer ?? null;
  const headerAvatarUrl =
    composeChannelKind === 'direct' && composePeer
      ? (channelDetail?.members.find((member) => member.account === composePeer)?.avatar_url ??
        activeChannel?.peer_avatar_url ??
        null)
      : null;

  const showAuthorNames = channelDetail?.kind === 'group';

  return (
    <>
      <MessagingLayout
        mobileView={mobileView}
        onMobileBack={() => setMobileView('list')}
        list={mobileList}
        listDesktopHidden={listInLeftRail}
        chat={
          activeChannelId || pendingPeer ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {composeChannelKind === 'direct' && composePeer ? (
                  <UserAvatar
                    username={composePeer}
                    avatarUrl={headerAvatarUrl}
                    displayName={chatTitle}
                    size={36}
                  />
                ) : null}
                <div className="min-w-0">
                  <h3 className="truncate font-weight-strong text-fg">{chatTitle}</h3>
                  {channelDetail?.kind === 'group' && channelDetail.members.length ? (
                    <p className="text-caption text-muted">
                      {t('messaging_members_count').replace(
                        '{count}',
                        String(channelDetail.members.length),
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
              <MessagingMessageList
                messages={messages}
                viewerUsername={viewerUsername}
                showAuthorNames={showAuthorNames}
                scrollContainerRef={listRef}
                topSentinelRef={topSentinelRef}
                loadingOlder={loadingOlder}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              <MessagingComposeBar
                editorKey={composeEditorKey}
                channelKind={composeChannelKind}
                peer={composePeer}
                members={composeMembers}
                viewerUsername={viewerUsername}
                hasPriorMessages={hasPriorMessages}
                pending={pending || messageUpdatePending}
                pendingEncrypted={pendingEncrypted}
                composeIntent={composeIntent}
                onDismissComposeIntent={() => {
                  setComposeIntent(null);
                  setComposeEditorKey((key) => key + 1);
                }}
                initialBody={
                  composeIntent?.mode === 'edit'
                    ? composeIntent.message.body ?? undefined
                    : undefined
                }
                sendAriaLabel={
                  composeIntent?.mode === 'edit'
                    ? t('messaging_edit_save')
                    : undefined
                }
                onSendPlain={onSendPlain}
                onSendEncrypted={onSendEncrypted}
                onRequireLogin={openLogin}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-body-sm text-muted">
              {t('messaging_select_chat')}
            </div>
          )
        }
        about={
          listInLeftRail
            ? undefined
            : channelDetail
              ? (
                  <MessagingChannelAbout
                    channel={channelDetail}
                    onEdit={() => setEditOpen(true)}
                    onLeave={() => setLeaveOpen(true)}
                  />
                )
              : undefined
        }
      />
      <NewMessageModal
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        viewerUsername={viewerUsername}
        pending={groupCreatePending}
        onStartChat={handleStartChat}
      />
      <LeaveGroupModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        channel={channelDetail}
        leavePolicy={channelDetail?.leave_policy ?? EMPTY_LEAVE_POLICY}
        pending={leavePending}
        onConfirm={async (input) => {
          if (!channelDetail?.channel_id) {
            return;
          }
          const ok = await leaveGroupChannel({
            channelId: channelDetail.channel_id,
            successorAdmin: input.successorAdmin,
            deleteMyMessages: input.deleteMyMessages,
          });
          if (ok) {
            setLeaveOpen(false);
          }
        }}
      />
      <EditGroupModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        channel={channelDetail}
        viewerUsername={viewerUsername}
        pending={updatePending}
        addPending={addMembersPending}
        onSave={async (input) => {
          if (!channelDetail?.channel_id) {
            return;
          }
          await updateGroupChannel({
            channelId: channelDetail.channel_id,
            title: input.title,
            imageCid: input.imageCid,
          });
        }}
        onAddMembers={async (accounts) => {
          if (!channelDetail?.channel_id) {
            return;
          }
          await addGroupMembers({ channelId: channelDetail.channel_id, accounts });
        }}
      />
    </>
  );
}
