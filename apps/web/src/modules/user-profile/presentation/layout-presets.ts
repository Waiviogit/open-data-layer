/**
 * Documentation-as-code: valid profile layout combinations for agents and humans.
 * Not consumed by the layout system at runtime.
 */
export const PROFILE_LAYOUT_PRESETS = {
  default: {
    arrangement: 'feed',
    showLeftSidebar: true,
    showRightSidebar: true,
  },
  media: {
    arrangement: 'grid',
    showLeftSidebar: true,
    showRightSidebar: false,
  },
  article: {
    arrangement: 'centered-article',
    showLeftSidebar: false,
    showRightSidebar: false,
  },
} as const;
