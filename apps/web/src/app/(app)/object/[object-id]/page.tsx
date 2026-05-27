import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { ObjectPageBody } from '@/modules/object/presentation/components/object-page-body';
import { ObjectDescriptionBody } from '@/modules/object/presentation/components/object-description-body';
import {
  resolveNestedObjectContent,
  resolveNestedObjectPath,
} from '@/modules/object/infrastructure/resolve-nested-object-content.server';
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
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_GALLERY_ALBUM_PARAM,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  parseAuthoritySubTypeParam,
  parseViewPathParam,
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
  } else if (tab === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
    const descriptionLabel =
      typeof messages.object_detail_description_button === 'string'
        ? messages.object_detail_description_button
        : 'Description';
    title = `${baseTitle} · ${descriptionLabel}`;
  } else if (tab === 'gallery') {
    const galleryLabel =
      typeof messages.gallery === 'string' ? messages.gallery : 'Gallery';
    title = `${baseTitle} · ${galleryLabel}`;
  } else if (tab === 'experts') {
    const expertsLabel =
      typeof messages.experts === 'string' ? messages.experts : 'Experts';
    title = `${baseTitle} · ${expertsLabel}`;
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

  const allowed = new Set(model.primaryTabs.map((t) => t.segment));
  const tabRaw = firstSearchParam(sp, OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  const pathIds = parseViewPathParam(sp);

  let initialPrimarySegment = '';
  if (tabRaw === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
    initialPrimarySegment = OBJECT_PAGE_DESCRIPTION_SEGMENT;
  } else if (tabRaw && allowed.has(tabRaw)) {
    initialPrimarySegment = tabRaw;
  } else if (!tabRaw && pathIds.length === 0) {
    switch (model.defaultLanding.kind) {
      case 'primaryTab':
        if (model.defaultLanding.segment === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
          initialPrimarySegment = OBJECT_PAGE_DESCRIPTION_SEGMENT;
        } else if (allowed.has(model.defaultLanding.segment)) {
          initialPrimarySegment = model.defaultLanding.segment;
        }
        break;
      case 'routeStub':
        if (allowed.has('reviews')) {
          initialPrimarySegment = 'reviews';
        }
        break;
      case 'nestedInHost':
      case 'hostContent':
        initialPrimarySegment = '';
        break;
    }
  }

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

  const nestedResolveInit = { locale, viewer: user?.username ?? null };
  const initialNestedStack = await resolveNestedObjectPath(pathIds, nestedResolveInit);

  const defaultNestedContent =
    pathIds.length === 0 && model.defaultLanding.kind === 'nestedInHost'
      ? await resolveNestedObjectContent(
          model.defaultLanding.targetObjectId,
          nestedResolveInit,
        )
      : null;

  const objectPageBody =
    model.objectType === 'page' && model.pageContent
      ? <ObjectPageBody rawContent={model.pageContent} />
      : undefined;

  const objectDescriptionBody =
    initialPrimarySegment === OBJECT_PAGE_DESCRIPTION_SEGMENT
      ? (
          <ObjectDescriptionBody
            descriptionContent={model.descriptionContent}
            galleryPhotos={model.previewGallery}
          />
        )
      : undefined;

  const galleryAlbumRaw = firstSearchParam(sp, OBJECT_PAGE_GALLERY_ALBUM_PARAM)?.trim();
  const initialGalleryAlbum = galleryAlbumRaw
    ? (() => {
        try {
          return decodeURIComponent(galleryAlbumRaw);
        } catch {
          return galleryAlbumRaw;
        }
      })()
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
        initialGalleryAlbum={initialGalleryAlbum}
        initialNestedStack={initialNestedStack}
        defaultNestedContent={defaultNestedContent}
        objectPageBody={objectPageBody}
        objectDescriptionBody={objectDescriptionBody}
      />
    </>
  );
}
