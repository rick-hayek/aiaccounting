import { useColorScheme } from 'react-native';
import { Themes, DEFAULT_THEME, type ThemeColors } from '@/constants/theme';

/**
 * Returns the active theme colors based on system color scheme.
 * In the future, themeKey can be read from user settings to support
 * swappable themes (e.g. 'green', 'blue', 'purple').
 */
export function useThemeColors(themeKey: string = DEFAULT_THEME): ThemeColors {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Themes[themeKey] ?? Themes[DEFAULT_THEME];
  return isDark ? theme.dark : theme.light;
}
