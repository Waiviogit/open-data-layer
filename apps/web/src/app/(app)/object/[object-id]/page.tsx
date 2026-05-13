import type { Metadata } from 'next';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import type {
  ObjectAboutPanelView,
  ObjectFeedSubTabView,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSidebarMiniCardView,
  ObjectSwitcherKind,
} from '@/modules/object';

import { ObjectPageClient } from './object-page-client';

const MOCK_PRIMARY_TABS: ObjectPrimaryTabView[] = [
  { segment: 'reviews', label: 'Reviews' },
  { segment: 'gallery', label: 'Gallery' },
  { segment: 'updates', label: 'Updates', count: 25 },
  { segment: 'followers', label: 'Followers', count: 0 },
  { segment: 'experts', label: 'Experts' },
];

const MOCK_FEED_SUB_TABS: ObjectFeedSubTabView[] = [
  { segment: 'posts', label: 'Posts' },
  { segment: 'threads', label: 'Threads' },
];

function miniCard(id: string, title: string): ObjectSidebarMiniCardView {
  return { id, title, imageSrc: null };
}

function defaultAbout(): ObjectAboutPanelView {
  return {
    introParagraph: '',
    prosTags: [],
    galleryThumbUrls: [],
    hoursLines: [],
    overallReviewCount: undefined,
  };
}

function mockKindLabel(kind: ObjectSwitcherKind): string {
  switch (kind) {
    case 'list':
      return 'List';
    case 'page':
      return 'Page';
    case 'newsfeed':
      return 'News feed';
    case 'widget':
      return 'Widget';
    case 'webpage':
      return 'Web page';
    case 'map':
      return 'Map';
    case 'shop':
      return 'Shop';
    case 'group':
      return 'Group';
    case 'default':
      return 'Object';
    default: {
      const _e: never = kind;
      return _e;
    }
  }
}

const MOCK_OBJECTS: Record<string, ObjectPageViewModel> = {
  'demo-shop': {
    objectId: 'demo-shop',
    title: 'Tolon Accesorios C.A.',
    avatarUrl: null,
    coverImageUrl: null,
    kindLabel: mockKindLabel('shop'),
    tagline: 'Cell phone accessory store',
    displayWeightLabel: '178.98',
    objectType: 'shop',
    rating01To5: 4,
    primaryTabs: MOCK_PRIMARY_TABS,
    feedSubTabs: MOCK_FEED_SUB_TABS,
    aboutPanel: {
      introParagraph:
        'Tolon Accesorios C.A. offers phone cases, chargers, and repairs with same-day service for common models. Mock description for layout parity.',
      prosTags: ['hbd'],
      galleryThumbUrls: [],
      hoursLines: [
        'Monday — 9:00 AM–7:00 PM',
        'Tuesday — 9:00 AM–7:00 PM',
        'Wednesday — 9:00 AM–7:00 PM',
        'Thursday — 9:00 AM–7:00 PM',
        'Friday — 9:00 AM–8:00 PM',
        'Saturday — 10:00 AM–6:00 PM',
        'Sunday — Closed',
      ],
      overallReviewCount: 2,
    },
    rightFeatured: [
      miniCard('e1', 'Expert One'),
      miniCard('e2', 'Expert Two'),
      miniCard('e3', 'Expert Three'),
    ],
    rightRelated: [
      miniCard('n1', 'Nearby Shop A'),
      miniCard('n2', 'Nearby Shop B'),
    ],
    rightSimilar: [miniCard('s1', 'Similar venue')],
  },
  'demo-newsfeed': {
    objectId: 'demo-newsfeed',
    title: 'City Pulse Desk',
    avatarUrl: null,
    coverImageUrl: null,
    kindLabel: mockKindLabel('newsfeed'),
    tagline: null,
    displayWeightLabel: null,
    objectType: 'newsfeed',
    rating01To5: null,
    primaryTabs: MOCK_PRIMARY_TABS,
    feedSubTabs: MOCK_FEED_SUB_TABS,
    aboutPanel: {
      ...defaultAbout(),
      introParagraph:
        'News digest placeholder — aggregated headlines will appear here when wired to the API.',
    },
    rightFeatured: [miniCard('nf-1', 'Breaking digest')],
    rightRelated: [miniCard('nf-2', 'Metro newsletter')],
    rightSimilar: [],
  },
};

function mockModelForObjectId(objectId: string): ObjectPageViewModel {
  const preset = MOCK_OBJECTS[objectId];
  if (preset) {
    return preset;
  }

  let inferredKind: ObjectSwitcherKind = 'default';
  if (objectId.includes('shop')) {
    inferredKind = 'shop';
  } else if (objectId.includes('map')) {
    inferredKind = 'map';
  }

  return {
    objectId,
    title: `Object ${objectId}`,
    avatarUrl: null,
    coverImageUrl: null,
    kindLabel: mockKindLabel(inferredKind),
    tagline: null,
    displayWeightLabel: null,
    objectType: inferredKind,
    rating01To5: null,
    primaryTabs: MOCK_PRIMARY_TABS,
    feedSubTabs: MOCK_FEED_SUB_TABS,
    aboutPanel: {
      ...defaultAbout(),
      introParagraph:
        'About text placeholder — describe this object when connected to real data.',
    },
    rightFeatured: [miniCard('gen-f', 'Featured placeholder')],
    rightRelated: [miniCard('gen-r', 'Related placeholder')],
    rightSimilar: [miniCard('gen-s', 'Similar placeholder')],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'object-id': string }>;
}): Promise<Metadata> {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const model = mockModelForObjectId(objectId);
  const label =
    typeof messages.object === 'string' ? messages.object : 'object';

  return {
    title: `${model.title} · ${label}`,
  };
}

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ 'object-id': string }>;
}) {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const model = mockModelForObjectId(objectId);

  return <ObjectPageClient model={model} />;
}
