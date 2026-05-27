import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function AppTabs() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <NativeTabs
      backgroundColor={colors.tabBar}
      indicatorColor={colors.tabBarBorder}
      labelStyle={{
        selected: { color: colors.tabIconSelected },
        default: { color: colors.tabIconDefault },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('home.title')}</NativeTabs.Trigger.Label>
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
        <NativeTabs.Trigger.Label>{t('stats.title')}</NativeTabs.Trigger.Label>
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
        <NativeTabs.Trigger.Label>{t('ai.title')}</NativeTabs.Trigger.Label>
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
        <NativeTabs.Trigger.Label>{t('ledger.title')}</NativeTabs.Trigger.Label>
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
        <NativeTabs.Trigger.Label>{t('settings.title')}</NativeTabs.Trigger.Label>
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
