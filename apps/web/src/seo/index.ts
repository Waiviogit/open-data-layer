export type {
  ObjectSeoInput,
  PostSeoInput,
  ProfileSeoInput,
  SeoBuildContext,
} from './domain/metadata.types';

export { buildArticleJsonLd } from './domain/article-jsonld.builder';
export { buildPersonJsonLd } from './domain/person-jsonld.builder';
export {
  objectCanonical,
  postCanonical,
  profileCanonical,
  homeCanonical,
  discoverCanonical,
  signInCanonical,
} from './domain/canonical';

export { buildObjectMetadata } from './application/build-object-metadata';
export { buildPostMetadata } from './application/build-post-metadata';
export { buildProfileMetadata } from './application/build-profile-metadata';
export { buildHomeMetadata } from './application/build-home-metadata';
export { buildDiscoverMetadata } from './application/build-discover-metadata';
export { buildSignInMetadata } from './application/build-sign-in-metadata';

export { seoPublicOrigin } from './infrastructure/seo-public-origin';
export type {
  SitemapObjectEntry,
  SitemapUserEntry,
} from './infrastructure/sitemap-data';
export {
  fetchDiscoverObjectsForSitemap,
  fetchDiscoverUsersForSitemap,
} from './infrastructure/sitemap-data';

export { JsonLdScript } from './presentation/json-ld-script';
