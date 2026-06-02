export const themeRegistry = {
  light: {
    label: 'Light',
    description:
      'Default feed UI — orange accent, Medium-style type (Sohne / GT Super / Charter), flat cards',
  },
  dark: {
    label: 'Dark',
    description:
      'Dark feed UI — same orange accent and Medium-style type scale as Light',
  },
  studio: {
    label: 'Studio',
    description: 'Clean product UI — teal accent, system sans, generous type scale',
  },
  midnight: {
    label: 'Midnight',
    description: 'Zinc dark canvas — teal accent, system sans, generous type scale',
  },
  sepia: {
    label: 'Sepia',
    description: 'Warm reading mode',
  },
  apple: {
    label: 'Apple',
    description: 'Neutral marketing preset — Apple blue accent, SF-style type',
  },
  airbnb: {
    label: 'Airbnb',
    description: 'White canvas, Rausch red accent, Cereal-style type, warm shadows',
  },
} as const;
