/**
 * Documentation-as-code: valid profile layout combinations for agents and humans.
 * Not consumed by the layout system at runtime.
 */
export const PROFILE_LAYOUT_PRESETS = {
  default: {
    arrangement: 'feed',
    showHero: true,
    showLeftSidebar: true,
    showNavMenu: false,
    showRightSidebar: true,
  },
  twitter: {
    arrangement: 'feed',
    showHero: false,
    showLeftSidebar: false,
    showNavMenu: true,
    showRightSidebar: true,
  },
  instagram: {
    arrangement: 'grid',
    showHero: true,
    showLeftSidebar: false,
    showNavMenu: false,
    showRightSidebar: false,
    menuFilter: ['feed', 'transfers'] as const,
  },
  media: {
    arrangement: 'grid',
    showHero: true,
    showLeftSidebar: true,
    showNavMenu: false,
    showRightSidebar: false,
  },
  article: {
    arrangement: 'centered-article',
    showHero: true,
    showLeftSidebar: false,
    showNavMenu: false,
    showRightSidebar: false,
  },
} as const;
