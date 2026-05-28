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
    settings = { themeMode: 'system', themeColor: DEFAULT_THEME };
  }

  const themeMode = settings.themeMode || 'system';
  const activeColorKey = themeKey || settings.themeColor || DEFAULT_THEME;

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = Themes[activeColorKey] ?? Themes[DEFAULT_THEME];
  return isDark ? theme.dark : theme.light;
}
