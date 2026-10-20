export {
  useSyncedPaginatedList,
  type SyncedPaginatedInitial,
  type SyncedPaginatedListState,
} from './hooks/use-synced-paginated-list';
export {
  useInfiniteScroll,
  type UseInfiniteScrollOptions,
} from './hooks/use-infinite-scroll';
export { useLockBodyScroll } from './hooks/use-lock-body-scroll';
export { useModalScrollLock } from './hooks/use-modal-scroll-lock';
export { shouldUnoptimizeRemoteImage } from './image/should-unoptimize-remote-image';
export {
  getImagePathPost,
  getPreviewProxyImageUrl,
  getProxyImageUrl,
  normalizeLegacyObjectImageUrl,
  resolveObjectImageUrl,
  stripHiveImageProxyPrefix,
} from '../infrastructure/image/get-proxy-image-url';
export {
  AVATAR_PLACEHOLDER_SRC,
  OBJECT_LOGO_FRAME_CLASS,
  OBJECT_LOGO_IMAGE_CLASS,
  resolveAvatarUrl,
} from './avatar';
export type { ResolveAvatarUrlInput, UserAvatarProps } from './avatar';
export { UserAvatar } from './avatar';

export { CaseTransformTextField } from './components/case-transform-text-field';
export type { CaseTransformTextFieldProps } from './components/case-transform-text-field';
export { IpfsImageDropZone } from './components/ipfs-image-drop-zone';
export type { IpfsImageDropZoneProps } from './components/ipfs-image-drop-zone';
export { ImageEditorPanel } from './components/image-editor';
export type { ImageEditorConfig, ImageEditorPanelProps } from './components/image-editor';
export {
  AppModal,
  AppModalCloseButton,
  APP_MODAL_Z_INDEX,
} from './components/app-modal';
export type { AppModalProps } from './components/app-modal';
export { AppLoader } from './components/app-loader';
export type { AppLoaderProps } from './components/app-loader';
export {
  ModalShell,
  ModalShellCloseButton,
} from './components/modal-shell';
export type { ModalShellProps, ModalShellVariant, ModalShellCloseButtonProps } from './components/modal-shell';
export {
  MODAL_Z_INDEX_DEFAULT,
  MODAL_Z_INDEX_ABOVE_MAP,
  MODAL_Z_INDEX_GALLERY,
  MODAL_Z_INDEX_GEO_FULLSCREEN,
  APP_MODAL_Z_INDEX as MODAL_Z_INDEX_APP,
} from './components/modal-shell.constants';
export { HydrationSafeAnchor } from './components/hydration-safe-anchor';
export { ObjectThumbnail } from './components/object-thumbnail';
export type { ObjectThumbnailProps } from './components/object-thumbnail';
export { StatHoverTooltip } from './components/stat-hover-tooltip';
export type { StatHoverTooltipProps } from './components/stat-hover-tooltip';
export { NavMenu } from './components/nav-menu';
export type { NavMenuItem, NavMenuProps } from './components/nav-menu';
export {
  profileSectionTabClass,
  profileSectionVerticalLinkClass,
} from './components/profile-section-tab-classes';
export type { ProfileSectionTabSize } from './components/profile-section-tab-classes';
export { PlaceholderSlot } from './components/placeholder-slot';
export { ShellModeSwitcher } from './components/shell-mode-switcher';
export { ThemeSwitcher } from './components/theme-switcher';
export { SocialEmbedHtml } from './components/social-embed-html';
export type { SocialEmbedHtmlProps } from './components/social-embed-html';
export {
  VideoPreviewPlayer,
  parseVideoUrl,
  type ParsedVideoPreview,
} from './components/video-preview-player';
export type { VideoPreviewPlayerProps } from './components/video-preview-player';
export { useVideoPreviewThumbnail } from './hooks/use-video-preview-thumbnail';

export * from './navigation';
export * from './layout';
