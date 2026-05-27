import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

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
  fetchObjectRefList,
  projectedObjectToRefCard,
  REF_LIST_PAGE_SIZE,
  RIGHT_RAIL_REF_FETCH_LIMIT,
  type ObjectRefListPageView,
} from '@/modules/object/infrastructure/object-ref-list.client';
import type { ObjectPageViewModel } from '@/modules/object';
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

const REF_LIST_PRIMARY_SEGMENTS = ['related', 'similar', 'add-on'] as const;

function objectTypeSupportsRefList(
  objectTypeKey: string,
  updateType: string,
): boolean {
  const registryEntry =
    OBJECT_TYPE_REGISTRY[objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
  return registryEntry?.supported_updates.includes(updateType) ?? false;
}

function mergeRightRailIntoModel(
  model: ObjectPageViewModel,
  related: ObjectRefListPageView | null,
  similar: ObjectRefListPageView | null,
  addOn: ObjectRefListPageView | null,
): ObjectPageViewModel {
  return {
    ...model,
    rightRelated: related?.items.slice(0, 5).map(projectedObjectToRefCard) ?? [],
    rightSimilar: similar?.items.slice(0, 5).map(projectedObjectToRefCard) ?? [],
    rightAddOn: addOn?.items.slice(0, 5).map(projectedObjectToRefCard) ?? [],
    rightRelatedHasMore: related?.hasMore ?? false,
    rightSimilarHasMore: similar?.hasMore ?? false,
    rightAddOnHasMore: addOn?.hasMore ?? false,
  };
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
  const refListSegments = new Set<string>(REF_LIST_PRIMARY_SEGMENTS);
  const tabRaw = firstSearchParam(sp, OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  const pathIds = parseViewPathParam(sp);

  let initialPrimarySegment = '';
  if (tabRaw === OBJECT_PAGE_DESCRIPTION_SEGMENT) {
    initialPrimarySegment = OBJECT_PAGE_DESCRIPTION_SEGMENT;
  } else if (tabRaw && (allowed.has(tabRaw) || refListSegments.has(tabRaw))) {
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
  const refFetchInit = { locale, viewer: user?.username ?? null };

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

  const [relatedRailPage, similarRailPage, addOnRailPage] = await Promise.all([
    supportsRelated
      ? fetchObjectRefList(
          objectId,
          'related',
          { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
          refFetchInit,
        )
      : Promise.resolve(null),
    supportsSimilar
      ? fetchObjectRefList(
          objectId,
          'similar',
          { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
          refFetchInit,
        )
      : Promise.resolve(null),
    supportsAddOn
      ? fetchObjectRefList(
          objectId,
          'add-on',
          { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
          refFetchInit,
        )
      : Promise.resolve(null),
  ]);

  const clientModel = mergeRightRailIntoModel(
    model,
    relatedRailPage,
    similarRailPage,
    addOnRailPage,
  );

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

  const embeddedRelatedPage =
    initialPrimarySegment === 'related' && supportsRelated
      ? await fetchObjectRefList(
          objectId,
          'related',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
        )
      : null;

  const embeddedSimilarPage =
    initialPrimarySegment === 'similar' && supportsSimilar
      ? await fetchObjectRefList(
          objectId,
          'similar',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
        )
      : null;

  const embeddedAddOnPage =
    initialPrimarySegment === 'add-on' && supportsAddOn
      ? await fetchObjectRefList(
          objectId,
          'add-on',
          { limit: REF_LIST_PAGE_SIZE },
          refFetchInit,
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
        model={clientModel}
        embeddedUpdatesFeed={embeddedUpdatesFeed}
        embeddedFollowersPage={embeddedFollowersPage}
        followersSort={followersSort}
        embeddedAuthorityPage={embeddedAuthorityPage}
        authoritySubType={authoritySubType}
        authoritySort={authoritySort}
        embeddedRelatedPage={embeddedRelatedPage}
        embeddedSimilarPage={embeddedSimilarPage}
        embeddedAddOnPage={embeddedAddOnPage}
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
