import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { ObjectPageBody } from '@/modules/object/presentation/components/object-page-body';
import { ObjectDescriptionBody } from '@/modules/object/presentation/components/object-description-body';
import {
  ObjectPageRightRailSkeleton,
  ObjectPageUpdatesFeedSkeleton,
} from '@/modules/object/presentation/components/object-page-loading-skeleton';
import {
  resolveNestedObjectContent,
  resolveNestedObjectPath,
} from '@/modules/object/infrastructure/resolve-nested-object-content.server';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { buildObjectMetadata, JsonLdScript } from '@/seo';

import { getObjectAuthorityPageQuery } from '@/modules/object/application/queries/get-object-authority-page.query';
import { getObjectFollowersPageQuery } from '@/modules/object/application/queries/get-object-followers-page.query';
import {
  fetchObjectRefList,
  REF_LIST_PAGE_SIZE,
} from '@/modules/object/infrastructure/object-ref-list.client';
import type { ObjectPageViewModel } from '@/modules/object';
import {
  parseSubscriptionSortParam,
  USER_SOCIAL_PAGE_SIZE,
} from '@/modules/user-social';

import { loadObjectPageModel } from './object-page-model.server';
import { ObjectPageRightRailSection } from './object-page-right-rail-section.server';
import { ObjectPageUpdatesFeedSection } from './object-page-updates-feed-section.server';
import {
  firstSearchParam,
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_GALLERY_ALBUM_PARAM,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  parseAuthoritySubTypeParam,
  parseViewPathParam,
  sanitizeNestedStack,
} from './object-page-search';
import { ObjectPageClient } from './object-page-client';

const REF_LIST_PRIMARY_SEGMENTS = ['related', 'similar', 'add-on'] as const;

function objectTypeSupportsRefList(
  objectTypeKey: string,
  updateType: string,
): boolean {
  const registryEntry =
    OBJECT_TYPE_REGISTRY[objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
  return registryEntry?.supported_updates.includes(updateType) ?? false;
}

function objectFollowersCount(model: ObjectPageViewModel): number {
  return model.primaryTabs.find((tab) => tab.segment === 'followers')?.count ?? 0;
}

function resolveInitialPrimarySegment(
  model: ObjectPageViewModel,
  sp: Record<string, string | string[] | undefined>,
  pathIds: string[],
): string {
  const allowed = new Set(model.primaryTabs.map((t) => t.segment));
  const refListSegments = new Set<string>(REF_LIST_PRIMARY_SEGMENTS);
  const tabRaw = firstSearchParam(sp, OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();

  if (tabRaw === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
    return OBJECT_PAGE_DESCRIPTION_SEGMENT;
  }
  if (tabRaw && (allowed.has(tabRaw) || refListSegments.has(tabRaw))) {
    return tabRaw;
  }
  if (!tabRaw && pathIds.length === 0) {
    switch (model.defaultLanding.kind) {
      case 'primaryTab':
        if (model.defaultLanding.segment === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
          return OBJECT_PAGE_DESCRIPTION_SEGMENT;
        }
        if (allowed.has(model.defaultLanding.segment)) {
          return model.defaultLanding.segment;
        }
        break;
      case 'routeStub':
        if (allowed.has('reviews')) {
          return 'reviews';
        }
        break;
      case 'nestedInHost':
      case 'hostContent':
        return '';
        break;
    }
  }
  return '';
}

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

  const model = await loadObjectPageModel(objectId, locale, null);
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
  } else if (tab === 'related') {
    const relatedLabel =
      typeof messages.object_right_related === 'string'
        ? messages.object_right_related
        : 'Related';
    title = `${baseTitle} · ${relatedLabel}`;
  } else if (tab === 'similar') {
    const similarLabel =
      typeof messages.object_right_similar === 'string'
        ? messages.object_right_similar
        : 'Similar';
    title = `${baseTitle} · ${similarLabel}`;
  } else if (tab === 'add-on') {
    const addOnLabel =
      typeof messages.object_right_add_on === 'string'
        ? messages.object_right_add_on
        : 'Add-On';
    title = `${baseTitle} · ${addOnLabel}`;
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
    keywords: model.seo?.keywords ?? null,
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

  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewerUsername = user?.username ?? null;

  const model = await loadObjectPageModel(objectId, locale, viewerUsername);

  if (!model) {
    notFound();
  }

  const pathIds = parseViewPathParam(sp);
  const initialPrimarySegment = resolveInitialPrimarySegment(model, sp, pathIds);

  const supportsRelated = objectTypeSupportsRefList(
    model.objectTypeKey,
    UPDATE_TYPES.IS_RELATED_TO,
  );
  const supportsSimilar = objectTypeSupportsRefList(
    model.objectTypeKey,
    UPDATE_TYPES.IS_SIMILAR_TO,
  );
  const supportsAddOn = objectTypeSupportsRefList(
    model.objectTypeKey,
    UPDATE_TYPES.ADD_ON,
  );

  const followersSort = parseSubscriptionSortParam(sp.sort);
  const authoritySubType = parseAuthoritySubTypeParam(sp);
  const authoritySort = parseSubscriptionSortParam(sp.sort);
  const nestedResolveInit = { locale, viewer: viewerUsername };
  const refFetchInit = { locale, viewer: viewerUsername };

  const [
    embeddedFollowersPage,
    embeddedAuthorityPage,
    embeddedRelatedPage,
    embeddedSimilarPage,
    embeddedAddOnPage,
    initialNestedStackRaw,
    defaultNestedContent,
  ] = await Promise.all([
    initialPrimarySegment === 'followers'
      ? getObjectFollowersPageQuery(
          objectId,
          { sort: followersSort, skip: 0, limit: USER_SOCIAL_PAGE_SIZE },
          viewerUsername,
        )
      : Promise.resolve(null),
    initialPrimarySegment === 'authority'
      ? getObjectAuthorityPageQuery(
          objectId,
          {
            authorityType: authoritySubType,
            sort: authoritySort,
            skip: 0,
            limit: USER_SOCIAL_PAGE_SIZE,
          },
          viewerUsername,
        )
      : Promise.resolve(null),
    initialPrimarySegment === 'related' && supportsRelated
      ? fetchObjectRefList(
          objectId,
          'related',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
        )
      : Promise.resolve(null),
    initialPrimarySegment === 'similar' && supportsSimilar
      ? fetchObjectRefList(
          objectId,
          'similar',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
        )
      : Promise.resolve(null),
    initialPrimarySegment === 'add-on' && supportsAddOn
      ? fetchObjectRefList(
          objectId,
          'add-on',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
        )
      : Promise.resolve(null),
    pathIds.length > 0
      ? resolveNestedObjectPath(pathIds, nestedResolveInit)
      : Promise.resolve([]),
    pathIds.length === 0 && model.defaultLanding.kind === 'nestedInHost'
      ? resolveNestedObjectContent(model.defaultLanding.targetObjectId, nestedResolveInit)
      : Promise.resolve(null),
  ]);

  const initialNestedStack = sanitizeNestedStack(pathIds, initialNestedStackRaw);

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

  const followersTabCount = objectFollowersCount(model);

  const updatesFeedSlot =
    initialPrimarySegment === 'updates' ? (
      <Suspense fallback={<ObjectPageUpdatesFeedSkeleton />}>
        <ObjectPageUpdatesFeedSection
          objectId={objectId}
          model={model}
          searchParams={sp}
          locale={locale}
          viewerUsername={viewerUsername}
        />
      </Suspense>
    ) : null;

  const rightRailSlot = (
    <Suspense fallback={<ObjectPageRightRailSkeleton />}>
      <ObjectPageRightRailSection
        objectId={objectId}
        objectTypeKey={model.objectTypeKey}
        locale={locale}
        viewerUsername={viewerUsername}
        followersTabCount={followersTabCount}
      />
    </Suspense>
  );

  return (
    <>
      <JsonLdScript data={model.seo?.json_ld} />
      <ObjectPageClient
        model={model}
        embeddedFollowersPage={embeddedFollowersPage}
        followersSort={followersSort}
        embeddedAuthorityPage={embeddedAuthorityPage}
        authoritySubType={authoritySubType}
        authoritySort={authoritySort}
        embeddedRelatedPage={embeddedRelatedPage}
        embeddedSimilarPage={embeddedSimilarPage}
        embeddedAddOnPage={embeddedAddOnPage}
        viewerUsername={viewerUsername}
        initialPrimarySegment={initialPrimarySegment}
        initialGalleryAlbum={initialGalleryAlbum}
        initialNestedStack={initialNestedStack}
        defaultNestedContent={defaultNestedContent}
        objectPageBody={objectPageBody}
        objectDescriptionBody={objectDescriptionBody}
        updatesFeedSlot={updatesFeedSlot}
        rightRailSlot={rightRailSlot}
        invalidPathRequested={pathIds.length > 0 && initialNestedStack.length === 0}
      />
    </>
  );
}
