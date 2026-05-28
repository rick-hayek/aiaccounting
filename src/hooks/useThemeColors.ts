import { useColorScheme } from 'react-native';
import { Themes, DEFAULT_THEME, type ThemeColors } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

/**
 * Returns the active theme colors based on dynamic user settings.
 */
export function useThemeColors(themeKey?: string): ThemeColors {
  const systemColorScheme = useColorScheme();
  
  let settings;
  try {
    settings = useSettings();
  } catch (e) {
    // Fallback if settings context is not initialized yet
    settings = { themeMode: 'system', themeColor: DEFAULT_THEME, customThemeColor: '#6366F1' };
  }

  const themeMode = settings.themeMode || 'system';
  const activeColorKey = themeKey || settings.themeColor || DEFAULT_THEME;

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  if (activeColorKey === 'custom') {
    const customColor = settings.customThemeColor || '#6366F1';
    if (isDark) {
      return {
        primary: customColor,
        primaryLight: customColor,
        primarySurface: customColor + '20',
        primaryGradientStart: customColor,
        primaryGradientEnd: customColor,
        background: '#121212',
        surface: '#1E1E1E',
        surfaceElevated: '#2D2D2D',
        text: '#F5F5F5',
        textSecondary: '#A3A3A3',
        textOnPrimary: '#121212',
        income: customColor,
        expense: '#E57373',
        warning: '#FFE082',
        divider: '#2D2D2D',
        tabBar: '#1E1E1E',
        tabBarBorder: '#2D2D2D',
        tabIconDefault: '#666666',
        tabIconSelected: customColor,
      };
    } else {
      return {
        primary: customColor,
        primaryLight: customColor,
        primarySurface: customColor + '12',
        primaryGradientStart: customColor,
        primaryGradientEnd: customColor,
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceElevated: '#F7F7F7',
        text: '#111111',
        textSecondary: '#767676',
        textOnPrimary: '#FFFFFF',
        income: customColor,
        expense: '#D32F2F',
        warning: '#F59E0B',
        divider: '#E5E5E5',
        tabBar: '#FFFFFF',
        tabBarBorder: '#E5E5E5',
        tabIconDefault: '#B3B3B3',
        tabIconSelected: customColor,
      };
    }
  }

  const theme = Themes[activeColorKey] ?? Themes[DEFAULT_THEME];
  return isDark ? theme.dark : theme.light;
}
