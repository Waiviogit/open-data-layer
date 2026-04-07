export const shellModeRegistry = {
  default: {
    label: 'Default',
    description: 'Standard app shell spacing and rails',
  },
  twitter: {
    label: 'Twitter',
    description: 'Narrow left rail, wider right rail, tighter feed gaps',
  },
  instagram: {
    label: 'Instagram',
    description: 'Icon rail, no right rail, tight grid gaps',
  },
  compact: {
    label: 'Compact',
    description: 'Dense chrome — narrower rails and card rhythm',
  },
} as const;
