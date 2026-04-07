/**
 * Documentation-as-code: valid profile layout combinations for agents and humans.
 * Not consumed by the layout system at runtime.
 */
export const PROFILE_LAYOUT_PRESETS = {
  default: {
    arrangement: 'feed',
    showLeftSidebar: true,
    showNavMenu: false,
    showRightSidebar: true,
  },
  twitter: {
    arrangement: 'feed',
    showLeftSidebar: false,
    showNavMenu: true,
    showRightSidebar: true,
  },
  media: {
    arrangement: 'grid',
    showLeftSidebar: true,
    showNavMenu: false,
    showRightSidebar: false,
  },
  article: {
    arrangement: 'centered-article',
    showLeftSidebar: false,
    showNavMenu: false,
    showRightSidebar: false,
  },
} as const;
