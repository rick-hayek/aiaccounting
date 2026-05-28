import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View, StyleSheet } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function AppTabs() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: t('stats.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => {
            const { style, onPress, children, ref, ...rest } = props as any;
            return (
              <Pressable
                onPress={onPress}
                ref={ref as any}
                {...rest}
                style={[
                  style,
                  styles.fabContainer,
                  { top: Platform.OS === 'ios' ? -18 : -14 }
                ]}
              >
                <View style={[styles.fab, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          },
        }}
      />

      <Tabs.Screen
        name="ledger"
        options={{
          title: t('ledger.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="edit"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    height: 68,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    // Elevation for Android
    elevation: 4,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
