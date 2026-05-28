export type ThemeId =
  | 'light'
  | 'dark'
  | 'studio'
  | 'midnight'
  | 'sepia'
  | 'apple'
  | 'airbnb';

export type ThemePreference = ThemeId | 'system';

export interface ThemeResolution {
  preference: ThemePreference;
  resolvedTheme: ThemeId;
  source: 'user' | 'cookie' | 'system' | 'default';
}
