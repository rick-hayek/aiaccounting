import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { migrateDbIfNeeded } from '@/database/db';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import '@/i18n';

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const systemScheme = useColorScheme();
  const isDark = settings.themeMode === 'system' 
    ? systemScheme === 'dark' 
    : settings.themeMode === 'dark';
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <SQLiteProvider databaseName="aiaccounting.db" onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <AppThemeProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </AppThemeProvider>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
