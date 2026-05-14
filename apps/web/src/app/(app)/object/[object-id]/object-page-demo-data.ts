import {
  projectedObjectWithCountsToPageModel,
  type ObjectFeedSubTabView,
  type ObjectPageViewModel,
  type ObjectPrimaryTabView,
  type ObjectSidebarMiniCardView,
  type ProjectedObjectWithCountsView,
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

function stubRights(): Pick<
  ObjectPageViewModel,
  'rightFeatured' | 'rightRelated' | 'rightSimilar'
> {
  return {
    rightFeatured: [
      miniCard('e1', 'Expert One'),
      miniCard('e2', 'Expert Two'),
      miniCard('e3', 'Expert Three'),
    ],
    rightRelated: [miniCard('n1', 'Nearby Shop A'), miniCard('n2', 'Nearby Shop B')],
    rightSimilar: [miniCard('s1', 'Similar venue')],
  };
}

const DEMO_SHOP_API: ProjectedObjectWithCountsView = {
  object_id: 'demo-shop',
  object_type: 'shop',
  semantic_type: null,
  weight: 178.98,
  hasAdministrativeAuthority: false,
  hasOwnershipAuthority: false,
  fields: {
    name: 'Tolon Accesorios C.A.',
    title: 'Phone accessories · repairs · same-day service',
    description:
      'Tolon Accesorios C.A. offers phone cases, chargers, and repairs with same-day service for common models. Mock description for layout parity.',
    aggregateRating: { averageRating: 8000, userRating: null },
    parent: {
      object_id: 'demo-parent-brand',
      object_type: 'business',
      fields: {
        image: '/images/logo.png',
        name: 'Demo brand parent',
      },
    },
    tagCategoryItem: [{ value: 'hbd', category: 'topics' }],
    tagCategory: ['topics'],
    workHours: [
      'Monday — 9:00 AM–7:00 PM',
      'Tuesday — 9:00 AM–7:00 PM',
      'Wednesday — 9:00 AM–7:00 PM',
      'Thursday — 9:00 AM–7:00 PM',
      'Friday — 9:00 AM–8:00 PM',
      'Saturday — 10:00 AM–6:00 PM',
      'Sunday — Closed',
    ].join('\n'),
    menuItem: [
      {
        title: 'Shop catalog',
        style: 'default',
        link_to_web: 'https://example.com/catalog',
      },
      {
        title: 'Repairs info',
        style: 'highlight',
        link_to_object: 'demo-list-ref',
        object_type: 'list',
      },
      {
        title: 'Social',
        style: 'icon',
        image: '/images/icons/picture.svg',
        link_to_web: 'https://example.com/social',
      },
    ],
    sortCustom: {
      include: ['Repairs info', 'Shop catalog'],
      exclude: [],
    },
    geo: { latitude: 10.4969, longitude: -66.8984 },
    address: {
      street: 'Av. Francisco de Miranda',
      locality: 'Caracas',
      postal_code: '1060',
      country: 'Venezuela',
      state: 'Miranda',
    },
    website: { title: 'Official site', link: 'https://example.com' },
    link: [
      { type: 'facebook', value: '@tolon' },
      { type: 'twitter', value: '@tolon_shop' },
      { type: 'hive', value: 'tolon' },
    ],
    telephone: '+58 212-555-0100',
    email: 'hello@example.com',
    walletAddress: [
      { symbol: 'Bitcoin (BTC)', address: 'bc1qexample0123456789' },
      { title: 'You can support us with btc!', symbol: 'Bitcoin (BTC)', address: 'bc1qexample0123456789' },
      { symbol: 'HIVE', address: 'demo-hive-account' },
    ],
    price: '29.99',
  },
  followers_count: 0,
  updates_count: 25,
};

const DEMO_NEWSFEED_API: ProjectedObjectWithCountsView = {
  object_id: 'demo-newsfeed',
  object_type: 'newsfeed',
  semantic_type: null,
  weight: null,
  hasAdministrativeAuthority: false,
  hasOwnershipAuthority: false,
  fields: {
    name: 'City Pulse Desk',
    description:
      'News digest placeholder — aggregated headlines will appear here when wired to the API.',
  },
  followers_count: 0,
  updates_count: 25,
};

const DEMO_BY_ID: Record<string, ProjectedObjectWithCountsView> = {
  'demo-shop': DEMO_SHOP_API,
  'demo-newsfeed': DEMO_NEWSFEED_API,
};

export function mockModelFromDemoPreset(objectId: string): ObjectPageViewModel | null {
  const api = DEMO_BY_ID[objectId];
  if (!api) {
    return null;
  }
  const core = projectedObjectWithCountsToPageModel(api);
  return {
    ...core,
    primaryTabs: MOCK_PRIMARY_TABS,
    feedSubTabs: MOCK_FEED_SUB_TABS,
    ...(objectId === 'demo-shop'
      ? stubRights()
      : {
          rightFeatured: [miniCard('nf-1', 'Breaking digest')],
          rightRelated: [miniCard('nf-2', 'Metro newsletter')],
          rightSimilar: [],
        }),
  };
}
