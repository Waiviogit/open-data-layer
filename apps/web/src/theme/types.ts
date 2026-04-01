export type ThemeId = 'light' | 'dark' | 'sepia';

export type ThemePreference = ThemeId | 'system';

export interface ThemeResolution {
  preference: ThemePreference;
  resolvedTheme: ThemeId;
  source: 'user' | 'cookie' | 'system' | 'default';
}
