import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import {
  EditorScreen,
  type LastDraftSidebarItem,
} from '@/modules/editor';
import { fetchUserPostDraftForEditor } from '@/modules/editor/infrastructure/fetch-user-post-draft.server';
import { fetchUserDraftListServer } from '@/modules/editor/infrastructure/query-api-drafts.server';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  return {
    title: messages.editor,
  };
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{
    author?: string;
    permlink?: string;
    draftId?: string;
  }>;
}) {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  if (!user) {
    redirect('/');
  }

  const sp = await searchParams;
  const authorParam = typeof sp.author === 'string' ? sp.author.trim() : '';
  if (
    authorParam &&
    authorParam.toLowerCase() !== user.username.toLowerCase()
  ) {
    redirect('/');
  }

  const permlink = typeof sp.permlink === 'string' ? sp.permlink.trim() : '';
  const draftIdParam =
    typeof sp.draftId === 'string' ? sp.draftId.trim() : '';

  let initialDraft: Awaited<
    ReturnType<typeof fetchUserPostDraftForEditor>
  > = null;
  if (draftIdParam) {
    initialDraft = await fetchUserPostDraftForEditor(user.username, {
      draftId: draftIdParam,
    });
  } else if (permlink) {
    initialDraft = await fetchUserPostDraftForEditor(user.username, {
      permlink,
    });
  }

  let sidebarDrafts: LastDraftSidebarItem[] = [];
  const listRes = await fetchUserDraftListServer(user.username, { limit: 5 });
  if (listRes.ok) {
    sidebarDrafts = listRes.value.items.map((d) => ({
      draftId: d.draftId,
      title: d.title,
      lastUpdated: d.lastUpdated,
    }));
  }

  const screenKey =
    initialDraft?.draftId ?? (permlink ? `p:${permlink}` : 'new');

  return (
    <EditorScreen
      key={screenKey}
      username={user.username}
      initialTitle={initialDraft?.title ?? ''}
      initialBody={initialDraft?.body ?? ''}
      initialDraftId={initialDraft?.draftId ?? null}
      sidebarDrafts={sidebarDrafts}
    />
  );
}
