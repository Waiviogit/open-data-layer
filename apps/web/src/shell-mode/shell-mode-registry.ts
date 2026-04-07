export const shellModeRegistry = {
  default: {
    label: 'Default',
    description: 'Standard app shell spacing and rails',
  },
  twitter: {
    label: 'Twitter',
    description:
      'Vertical nav in left rail, wider right rail, tighter feed gaps, no profile hero',
  },
  instagram: {
    label: 'Instagram',
    description:
      'Full-width profile, no sidebars, image preview grid, minimal nav',
  },
  compact: {
    label: 'Compact',
    description: 'Dense chrome — narrower rails and card rhythm',
  },
} as const;
