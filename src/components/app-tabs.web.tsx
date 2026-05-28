import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useThemeColors } from '@/hooks/useThemeColors';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const { t } = useTranslation();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{t('home.title')}</TabButton>
          </TabTrigger>
          <TabTrigger name="stats" href={"/stats" as any} asChild>
            <TabButton>{t('stats.title')}</TabButton>
          </TabTrigger>
          <TabTrigger name="ai" href={"/ai" as any} asChild>
            <TabButton isFab={true}>+</TabButton>
          </TabTrigger>
          <TabTrigger name="ledger" href={"/ledger" as any} asChild>
            <TabButton>{t('ledger.title')}</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href={"/settings" as any} asChild>
            <TabButton>{t('settings.title')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface CustomTabTriggerSlotProps extends TabTriggerSlotProps {
  isFab?: boolean;
}

export function TabButton({ children, isFocused, isFab, ...props }: CustomTabTriggerSlotProps) {
  const colors = useThemeColors();

  if (isFab) {
    return (
      <Pressable {...props} style={({ pressed }) => [pressed && styles.pressed, styles.fabWrapper]}>
        <View
          style={[
            styles.fabButton,
            { backgroundColor: isFocused ? colors.primaryLight : colors.primary },
          ]}
        >
          <ThemedText style={{ color: colors.textOnPrimary, fontSize: 20, fontWeight: '700', marginTop: -2 }}>
            {children}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? colors.primarySurface : colors.surfaceElevated },
        ]}
      >
        <ThemedText style={{ color: isFocused ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const colors = useThemeColors();

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider }]}>
        <ThemedText style={[styles.brandText, { color: colors.primary, fontSize: 16, fontWeight: 'bold' }]}>
          AIAccounting
        </ThemedText>

        <View style={styles.triggersRow}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: Spacing.four,
  },
  triggersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  fabWrapper: {
    marginHorizontal: Spacing.one,
  },
  fabButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
