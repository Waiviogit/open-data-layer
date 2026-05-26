import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import {
  getObjectUpdatesFeedPageQuery,
  parseObjectUpdatesSearchParams,
} from '@/modules/object-updates';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { buildObjectMetadata, JsonLdScript } from '@/seo';

import { getObjectAuthorityPageQuery } from '@/modules/object/application/queries/get-object-authority-page.query';
import { getObjectFollowersPageQuery } from '@/modules/object/application/queries/get-object-followers-page.query';
import {
  parseSubscriptionSortParam,
  USER_SOCIAL_PAGE_SIZE,
} from '@/modules/user-social';

import { loadObjectPageModel } from './object-page-model.server';
import {
  firstSearchParam,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  parseAuthoritySubTypeParam,
} from './object-page-search';
import { ObjectPageClient } from './object-page-client';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ 'object-id': string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const sp = await searchParams;

  const model = await loadObjectPageModel(objectId, locale);
  if (!model) {
    return { title: objectId };
  }

  const baseTitle = model.seo?.title ?? model.title;
  const objectLabel =
    typeof messages.object === 'string' ? messages.object : 'object';

  const tab = firstSearchParam(sp, OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  let title = `${baseTitle} · ${objectLabel}`;
  if (tab === 'updates') {
    const updatesLabel =
      typeof messages.object_updates_title === 'string'
        ? messages.object_updates_title
        : 'Updates';
    title = `${baseTitle} · ${updatesLabel}`;
  } else if (tab === 'followers') {
    const followersLabel =
      typeof messages.followers === 'string' ? messages.followers : 'Followers';
    title = `${baseTitle} · ${followersLabel}`;
  } else if (tab === 'authority') {
    const authorityLabel =
      typeof messages.authority === 'string' ? messages.authority : 'Authority';
    title = `${baseTitle} · ${authorityLabel}`;
  }

  return buildObjectMetadata({
    objectId: model.objectId,
    title,
    description: model.seo?.description ?? model.tagline,
    canonicalUrl: model.seo?.canonical_url ?? null,
    avatarUrl: model.avatarUrl,
    coverImageUrl: model.coverImageUrl,
    objectTypeKey: model.objectTypeKey,
    jsonLd: model.seo?.json_ld ?? null,
  });
}

export default async function ObjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ 'object-id': string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const locale = await getRequestLocale();
  const sp = await searchParams;
  const model = await loadObjectPageModel(objectId, locale);

  if (!model) {
    notFound();
  }

  const defaultSeg = model.primaryTabs[0]?.segment ?? 'reviews';
  const allowed = new Set(model.primaryTabs.map((t) => t.segment));
  const tabRaw = firstSearchParam(sp, OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  const initialPrimarySegment =
    tabRaw && allowed.has(tabRaw) ? tabRaw : defaultSeg;

  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();

  const filters = parseObjectUpdatesSearchParams(sp);
  const initialUpdatesPage = await getObjectUpdatesFeedPageQuery(
    objectId,
    { filters, cursor: null },
    { locale, viewer: user?.username ?? null },
  );

  const registryEntry =
    OBJECT_TYPE_REGISTRY[model.objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
  const supported = registryEntry?.supported_updates ?? [];
  const typeOptions = supported.map((u) => ({
    value: u,
    label: labelForUpdateType(u),
    count: model.updateTypeCounts[u] ?? 0,
  }));
  const showLocaleFilter = supported.some((u) => UPDATE_REGISTRY[u]?.localizable === true);
  const localizableTypes = supported.filter((u) => UPDATE_REGISTRY[u]?.localizable === true);

  const embeddedUpdatesFeed = {
    initialPage: initialUpdatesPage,
    filters,
    typeOptions,
    showLocaleFilter,
    localizableTypes,
  };

  const followersSort = parseSubscriptionSortParam(sp.sort);
  const authoritySubType = parseAuthoritySubTypeParam(sp);
  const authoritySort = parseSubscriptionSortParam(sp.sort);

  const embeddedFollowersPage =
    initialPrimarySegment === 'followers'
      ? await getObjectFollowersPageQuery(
          objectId,
          { sort: followersSort, skip: 0, limit: USER_SOCIAL_PAGE_SIZE },
          user?.username ?? null,
        )
      : null;

  const embeddedAuthorityPage =
    initialPrimarySegment === 'authority'
      ? await getObjectAuthorityPageQuery(
          objectId,
          {
            authorityType: authoritySubType,
            sort: authoritySort,
            skip: 0,
            limit: USER_SOCIAL_PAGE_SIZE,
          },
          user?.username ?? null,
        )
      : null;

  return (
    <>
      <JsonLdScript data={model.seo?.json_ld} />
      <ObjectPageClient
        model={model}
        embeddedUpdatesFeed={embeddedUpdatesFeed}
        embeddedFollowersPage={embeddedFollowersPage}
        followersSort={followersSort}
        embeddedAuthorityPage={embeddedAuthorityPage}
        authoritySubType={authoritySubType}
        authoritySort={authoritySort}
        viewerUsername={user?.username ?? null}
        initialPrimarySegment={initialPrimarySegment}
        defaultPrimarySegment={defaultSeg}
      />
    </>
  );
}
