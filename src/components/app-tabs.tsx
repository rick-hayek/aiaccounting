import React from 'react';
import { Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function AppTabs() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const pathname = usePathname();

  if (Platform.OS === 'ios') {
    const isHomeActive = pathname === '/' || pathname === '/index';
    const isStatsActive = pathname === '/stats';
    const isAiActive = pathname === '/ai';
    const isLedgerActive = pathname === '/ledger';
    const isSettingsActive = pathname === '/settings';

    return (
      <NativeTabs
        backgroundColor={colors.tabBar}
        indicatorColor={colors.tabBarBorder}
        iconColor={{
          selected: colors.tabIconSelected,
          default: colors.tabIconDefault,
        }}
        labelStyle={{
          selected: { color: colors.tabIconSelected },
          default: { color: colors.tabIconDefault },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label hidden={!isHomeActive}>{t('home.title')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="home-outline"
              />
            }
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="stats">
          <NativeTabs.Trigger.Label hidden={!isStatsActive}>{t('stats.title')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="stats-chart-outline"
              />
            }
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="ai">
          <NativeTabs.Trigger.Label hidden={!isAiActive}>{t('ai.title') || '+'}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="add-circle"
              />
            }
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="ledger">
          <NativeTabs.Trigger.Label hidden={!isLedgerActive}>{t('ledger.title')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="receipt-outline"
              />
            }
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label hidden={!isSettingsActive}>{t('settings.title')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name="settings-outline"
              />
            }
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
