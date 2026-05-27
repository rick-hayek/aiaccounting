import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { migrateDbIfNeeded } from '@/database/db';
import { SettingsProvider } from '@/context/SettingsContext';
import '@/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <SQLiteProvider databaseName="aiaccounting.db" onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
