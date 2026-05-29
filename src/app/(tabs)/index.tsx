import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import HomeScreenContent from '@/components/HomeScreenContent';
import StatsScreen from './stats';
import LedgerScreen from './ledger';
import SettingsScreen from './settings';

export default function RootIndex() {
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    return <HomeScreenContent />;
  }
  return <MobileTabContainer />;
}

function MobileTabContainer() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  const onScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    if (index >= 0 && index <= 3) {
      setActiveTab(index);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Swipeable ViewPager */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        <View style={{ width: screenWidth }}>
          <HomeScreenContent 
            isActive={activeTab === 0} 
            onNavigateToLedger={() => handleTabPress(2)} 
          />
        </View>
        <View style={{ width: screenWidth }}>
          <StatsScreen isActive={activeTab === 1} />
        </View>
        <View style={{ width: screenWidth }}>
          <LedgerScreen isActive={activeTab === 2} />
        </View>
        <View style={{ width: screenWidth }}>
          <SettingsScreen isActive={activeTab === 3} />
        </View>
      </ScrollView>

      {/* Custom Bottom Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            height: (Platform.OS === 'ios' ? 76 : 56) + (insets.bottom > 0 ? insets.bottom : 12) - 12,
          },
        ]}
      >
        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress(0)}>
          <Ionicons
            name={activeTab === 0 ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 0 ? colors.tabIconSelected : colors.tabIconDefault}
          />
          {activeTab === 0 && (
            <Text
              style={[
                styles.tabLabel,
                { color: colors.tabIconSelected },
              ]}
            >
              {t('home.title')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress(1)}>
          <Ionicons
            name={activeTab === 1 ? 'stats-chart' : 'stats-chart-outline'}
            size={22}
            color={activeTab === 1 ? colors.tabIconSelected : colors.tabIconDefault}
          />
          {activeTab === 1 && (
            <Text
              style={[
                styles.tabLabel,
                { color: colors.tabIconSelected },
              ]}
            >
              {t('stats.title')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Central Add FAB */}
        <Pressable
          onPress={() => router.navigate('/ai' as any)}
          style={[
            styles.fabContainer,
            { top: Platform.OS === 'ios' ? -18 : -14 }
          ]}
        >
          <View style={[styles.fab, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </View>
        </Pressable>

        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress(2)}>
          <Ionicons
            name={activeTab === 2 ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 2 ? colors.tabIconSelected : colors.tabIconDefault}
          />
          {activeTab === 2 && (
            <Text
              style={[
                styles.tabLabel,
                { color: colors.tabIconSelected },
              ]}
            >
              {t('ledger.title')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress(3)}>
          <Ionicons
            name={activeTab === 3 ? 'settings' : 'settings-outline'}
            size={22}
            color={activeTab === 3 ? colors.tabIconSelected : colors.tabIconDefault}
          />
          {activeTab === 3 && (
            <Text
              style={[
                styles.tabLabel,
                { color: colors.tabIconSelected },
              ]}
            >
              {t('settings.title')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
