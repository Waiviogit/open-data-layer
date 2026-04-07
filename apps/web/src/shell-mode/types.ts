export type ShellModeId = 'default' | 'twitter' | 'instagram' | 'compact';

export type ShellModePreference = ShellModeId;

export interface ShellModeResolution {
  preference: ShellModePreference;
  resolvedMode: ShellModeId;
  source: 'cookie' | 'default';
}
