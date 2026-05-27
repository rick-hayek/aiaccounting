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
      primary: '#2D6A4F',
      primaryLight: '#40916C',
      primarySurface: '#E8F5E9',
      primaryGradientStart: '#2D6A4F',
      primaryGradientEnd: '#52B788',

      background: '#F6FAF7',
      surface: '#FFFFFF',
      surfaceElevated: '#F0F5F1',

      text: '#1A1A2E',
      textSecondary: '#6B7280',
      textOnPrimary: '#FFFFFF',

      income: '#2D6A4F',
      expense: '#DC3545',
      warning: '#F59E0B',
      divider: '#E5E7EB',

      tabBar: '#FFFFFF',
      tabBarBorder: '#E5E7EB',
      tabIconDefault: '#9CA3AF',
      tabIconSelected: '#2D6A4F',
    },
    dark: {
      primary: '#52B788',
      primaryLight: '#74C69D',
      primarySurface: '#1A2E23',
      primaryGradientStart: '#2D6A4F',
      primaryGradientEnd: '#52B788',

      background: '#0F1A14',
      surface: '#1A2E23',
      surfaceElevated: '#243B2F',

      text: '#E8F5E9',
      textSecondary: '#9CA3AF',
      textOnPrimary: '#FFFFFF',

      income: '#52B788',
      expense: '#FF6B6B',
      warning: '#FBBF24',
      divider: '#2E3B33',

      tabBar: '#1A2E23',
      tabBarBorder: '#2E3B33',
      tabIconDefault: '#6B7280',
      tabIconSelected: '#52B788',
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    fab: {
      shadowColor: '#2D6A4F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  },
  android: {
    card: { elevation: 2 },
    elevated: { elevation: 6 },
    fab: { elevation: 8 },
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
