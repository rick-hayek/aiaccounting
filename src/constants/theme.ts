/**
 * Swappable Theme System for AI Accounting App
 * 
 * Design principles:
 *   - Each theme is a self-contained color palette object
 *   - Active theme is selected by key (e.g. 'green', 'blue')
 *   - Both light and dark variants are defined per theme
 *   - Components consume colors via useThemeColors() hook
 */

import { Platform } from 'react-native';

// ─── Theme color token interface ────────────────────────────────────────────

export interface ThemeColors {
  // Primary
  primary: string;
  primaryLight: string;
  primarySurface: string;
  primaryGradientStart: string;
  primaryGradientEnd: string;

  // Surfaces & Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textOnPrimary: string;

  // Semantic
  income: string;
  expense: string;
  warning: string;
  divider: string;

  // Tab bar
  tabBar: string;
  tabBarBorder: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

// ─── Theme definitions ──────────────────────────────────────────────────────

export interface AppTheme {
  light: ThemeColors;
  dark: ThemeColors;
}

export const Themes: Record<string, AppTheme> = {
  green: {
    light: {
      primary: '#527954',
      primaryLight: '#709A72',
      primarySurface: '#EDF5EE',
      primaryGradientStart: '#527954',
      primaryGradientEnd: '#527954',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F7F5',

      text: '#1A231A',
      textSecondary: '#8E9E8E',
      textOnPrimary: '#FFFFFF',

      income: '#527954',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#F0F3F0',

      tabBar: '#FFFFFF',
      tabBarBorder: '#F0F3F0',
      tabIconDefault: '#B8C4B8',
      tabIconSelected: '#527954',
    },
    dark: {
      primary: '#8EB790',
      primaryLight: '#A8CEA9',
      primarySurface: '#1E2D1F',
      primaryGradientStart: '#527954',
      primaryGradientEnd: '#527954',

      background: '#111612',
      surface: '#1B221C',
      surfaceElevated: '#262E27',

      text: '#F1F5F1',
      textSecondary: '#8E9E8E',
      textOnPrimary: '#FFFFFF',

      income: '#8EB790',
      expense: '#FF8A80',
      warning: '#FFE082',
      divider: '#262E27',

      tabBar: '#1B221C',
      tabBarBorder: '#262E27',
      tabIconDefault: '#5A665C',
      tabIconSelected: '#8EB790',
    },
  },
  blue: {
    light: {
      primary: '#4A6D8C',
      primaryLight: '#6B8EA6',
      primarySurface: '#EDF2F6',
      primaryGradientStart: '#4A6D8C',
      primaryGradientEnd: '#4A6D8C',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F7F8',

      text: '#1A1E24',
      textSecondary: '#8E959E',
      textOnPrimary: '#FFFFFF',

      income: '#4A6D8C',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#EFF2F5',

      tabBar: '#FFFFFF',
      tabBarBorder: '#EFF2F5',
      tabIconDefault: '#B8C0C8',
      tabIconSelected: '#4A6D8C',
    },
    dark: {
      primary: '#8EAECA',
      primaryLight: '#A8C4DE',
      primarySurface: '#1E252D',
      primaryGradientStart: '#4A6D8C',
      primaryGradientEnd: '#4A6D8C',

      background: '#111316',
      surface: '#1B1E22',
      surfaceElevated: '#262A30',

      text: '#F1F3F5',
      textSecondary: '#8E959E',
      textOnPrimary: '#FFFFFF',

      income: '#8EAECA',
      expense: '#FF8A80',
      warning: '#FFE082',
      divider: '#262A30',

      tabBar: '#1B1E22',
      tabBarBorder: '#262A30',
      tabIconDefault: '#5A626A',
      tabIconSelected: '#8EAECA',
    },
  },
  gold: {
    light: {
      primary: '#8C7355',
      primaryLight: '#AB9375',
      primarySurface: '#FAF6F0',
      primaryGradientStart: '#8C7355',
      primaryGradientEnd: '#8C7355',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#FAF7F5',

      text: '#241E18',
      textSecondary: '#9E9388',
      textOnPrimary: '#FFFFFF',

      income: '#8C7355',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#F5ECE3',

      tabBar: '#FFFFFF',
      tabBarBorder: '#F5ECE3',
      tabIconDefault: '#CFC4B8',
      tabIconSelected: '#8C7355',
    },
    dark: {
      primary: '#C4AE8E',
      primaryLight: '#DEC7A9',
      primarySurface: '#2B251E',
      primaryGradientStart: '#8C7355',
      primaryGradientEnd: '#8C7355',

      background: '#161311',
      surface: '#221E1A',
      surfaceElevated: '#2E2A24',

      text: '#F5F2F0',
      textSecondary: '#9E9388',
      textOnPrimary: '#FFFFFF',

      income: '#C4AE8E',
      expense: '#FF8A80',
      warning: '#FFE082',
      divider: '#2E2A24',

      tabBar: '#221E1A',
      tabBarBorder: '#2E2A24',
      tabIconDefault: '#6A6055',
      tabIconSelected: '#C4AE8E',
    },
  },
  black: {
    light: {
      primary: '#1A1A1A',
      primaryLight: '#333333',
      primarySurface: '#F2F2F2',
      primaryGradientStart: '#1A1A1A',
      primaryGradientEnd: '#1A1A1A',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F7F7F7',

      text: '#111111',
      textSecondary: '#767676',
      textOnPrimary: '#FFFFFF',

      income: '#2E7D32',
      expense: '#D32F2F',
      warning: '#F59E0B',
      divider: '#E5E5E5',

      tabBar: '#FFFFFF',
      tabBarBorder: '#E5E5E5',
      tabIconDefault: '#B3B3B3',
      tabIconSelected: '#1A1A1A',
    },
    dark: {
      primary: '#F5F5F5',
      primaryLight: '#E5E5E5',
      primarySurface: '#262626',
      primaryGradientStart: '#F5F5F5',
      primaryGradientEnd: '#F5F5F5',

      background: '#121212',
      surface: '#1E1E1E',
      surfaceElevated: '#2D2D2D',

      text: '#F5F5F5',
      textSecondary: '#A3A3A3',
      textOnPrimary: '#121212',

      income: '#81C784',
      expense: '#E57373',
      warning: '#FFE082',
      divider: '#2D2D2D',

      tabBar: '#1E1E1E',
      tabBarBorder: '#2D2D2D',
      tabIconDefault: '#666666',
      tabIconSelected: '#F5F5F5',
    },
  },
  red: {
    light: {
      primary: '#B34766',
      primaryLight: '#C9617F',
      primarySurface: '#FDF2F4',
      primaryGradientStart: '#B34766',
      primaryGradientEnd: '#B34766',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#FCF5F6',

      text: '#2D1B20',
      textSecondary: '#9E858A',
      textOnPrimary: '#FFFFFF',

      income: '#B34766',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#F5ECED',

      tabBar: '#FFFFFF',
      tabBarBorder: '#F5ECED',
      tabIconDefault: '#CFC0C2',
      tabIconSelected: '#B34766',
    },
    dark: {
      primary: '#E0859F',
      primaryLight: '#EA9EAB',
      primarySurface: '#351B22',
      primaryGradientStart: '#B34766',
      primaryGradientEnd: '#B34766',

      background: '#1A1113',
      surface: '#26191C',
      surfaceElevated: '#332226',

      text: '#F9ECEF',
      textSecondary: '#9E858A',
      textOnPrimary: '#1A1113',

      income: '#E0859F',
      expense: '#FF8A80',
      warning: '#FFE082',
      divider: '#332226',

      tabBar: '#26191C',
      tabBarBorder: '#332226',
      tabIconDefault: '#6E5559',
      tabIconSelected: '#E0859F',
    },
  },
  purple: {
    light: {
      primary: '#6366F1',
      primaryLight: '#818CF8',
      primarySurface: '#EEF2FF',
      primaryGradientStart: '#6366F1',
      primaryGradientEnd: '#6366F1',

      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F6FE',

      text: '#1E1B4B',
      textSecondary: '#9395D3',
      textOnPrimary: '#FFFFFF',

      income: '#6366F1',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#EBEFFF',

      tabBar: '#FFFFFF',
      tabBarBorder: '#EBEFFF',
      tabIconDefault: '#C7CEF2',
      tabIconSelected: '#6366F1',
    },
    dark: {
      primary: '#818CF8',
      primaryLight: '#99F6E4',
      primarySurface: '#1E1B4B',
      primaryGradientStart: '#6366F1',
      primaryGradientEnd: '#6366F1',

      background: '#0F0E17',
      surface: '#151421',
      surfaceElevated: '#201E32',

      text: '#EEF2FF',
      textSecondary: '#9395D3',
      textOnPrimary: '#0F0E17',

      income: '#818CF8',
      expense: '#FF8A80',
      warning: '#FFE082',
      divider: '#201E32',

      tabBar: '#151421',
      tabBarBorder: '#201E32',
      tabIconDefault: '#5B5A7D',
      tabIconSelected: '#818CF8',
    },
  },
};

// Default theme key
export const DEFAULT_THEME = 'green';

// ─── Legacy Colors export for backward compat ───────────────────────────────

export const Colors = {
  light: {
    text: Themes.green.light.text,
    background: Themes.green.light.background,
    backgroundElement: Themes.green.light.surfaceElevated,
    backgroundSelected: Themes.green.light.primarySurface,
    textSecondary: Themes.green.light.textSecondary,
  },
  dark: {
    text: Themes.green.dark.text,
    background: Themes.green.dark.background,
    backgroundElement: Themes.green.dark.surfaceElevated,
    backgroundSelected: Themes.green.dark.primarySurface,
    textSecondary: Themes.green.dark.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const Shadows = Platform.select({
  ios: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    fab: {
      shadowColor: '#3D5A3E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
  },
  android: {
    card: { elevation: 1 },
    elevated: { elevation: 3 },
    fab: { elevation: 6 },
  },
  default: {
    card: {},
    elevated: {},
    fab: {},
  },
}) as {
  card: Record<string, any>;
  elevated: Record<string, any>;
  fab: Record<string, any>;
};

// ─── Border Radius Presets ──────────────────────────────────────────────────

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Fonts ──────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ─── Spacing ────────────────────────────────────────────────────────────────

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ─── Layout Constants ───────────────────────────────────────────────────────

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
