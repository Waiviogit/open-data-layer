import type {
  ObjectAboutPanelView,
  ObjectFeedSubTabView,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSidebarMiniCardView,
} from '@/modules/object';

export const DEMO_OBJECT_IDS = new Set(['demo-shop', 'demo-newsfeed']);

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

const MOCK_OBJECTS: Record<string, ObjectPageViewModel> = {
  'demo-shop': {
    objectId: 'demo-shop',
    title: 'Tolon Accesorios C.A.',
    subtitleTitle: 'Phone accessories · repairs · same-day service',
    avatarUrl: null,
    coverImageUrl: null,
    kindLabel: 'shop',
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
    subtitleTitle: null,
    avatarUrl: null,
    coverImageUrl: null,
    kindLabel: 'newsfeed',
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

export function mockModelFromDemoPreset(objectId: string): ObjectPageViewModel | null {
  return MOCK_OBJECTS[objectId] ?? null;
}
