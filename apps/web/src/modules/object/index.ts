export type {
  AuthoritySubType,
  ObjectFeedSubTabView,
  ObjectLeftRailBlock,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSidebarMiniCardView,
  ObjectSwitcherKind,
} from './domain/object-page.types';
export { AUTHORITY_SUB_VALUES } from './domain/object-page.types';
export type { ProjectedObjectWithCountsView } from './infrastructure/object-resolve.types';
export type { ProjectedMenuItem } from './domain/projected-menu-item.types';

export { projectedObjectWithCountsToPageModel } from './infrastructure/projected-object-to-page-model';

export {
  LeftObjectProfileSidebar,
  ObjectGeoPreview,
  ObjectLeftRailPanel,
  ObjectHero,
  ObjectPrimaryContent,
  ObjectPrimaryNav,
  ObjectAuthoritySubNav,
  ObjectRightSidebar,
  ObjectSidebarMiniCard,
  ObjectViewShell,
  ObjectMenuItemsStatic,
} from './presentation';

export type {
  LeftObjectProfileSidebarProps,
  ObjectGeoPreviewProps,
  ObjectLeftRailPanelProps,
  ObjectHeroProps,
  ObjectPrimaryContentProps,
  ObjectPrimaryNavProps,
  ObjectAuthoritySubNavProps,
  ObjectRightSidebarProps,
  ObjectSidebarMiniCardProps,
  ObjectViewShellProps,
  ObjectMenuItemsStaticProps,
} from './presentation';
