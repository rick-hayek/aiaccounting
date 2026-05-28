import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

interface QuickEntryGridProps {
  onVoice: () => void;
  onAi: () => void;
  onManual: () => void;
  onScan: () => void;
}

export function QuickEntryGrid({ onVoice, onAi, onManual, onScan }: QuickEntryGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Define adaptive backgrounds and icon colors for Voice, Manual, and Scan entries
  const voiceBg = isDark ? '#0C2B3F' : '#E0F2FE';
  const voiceIcon = isDark ? '#38BDF8' : '#0284C7';

  const manualBg = isDark ? '#2D2305' : '#FEF3C7';
  const manualIcon = isDark ? '#F59E0B' : '#D97706';

  const scanBg = isDark ? '#25143A' : '#F3E8FF';
  const scanIcon = isDark ? '#A78BFA' : '#7C3AED';

  const entries = [
    {
      key: 'ai',
      icon: 'sparkles-outline' as const,
      label: t('quick.ai'),
      onPress: onAi,
      iconColor: colors.primary,
      iconBg: colors.primarySurface,
    },
    {
      key: 'voice',
      icon: 'mic-outline' as const,
      label: t('quick.voice'),
      onPress: onVoice,
      iconColor: voiceIcon,
      iconBg: voiceBg,
    },
    {
      key: 'manual',
      icon: 'create-outline' as const,
      label: t('quick.manual'),
      onPress: onManual,
      iconColor: manualIcon,
      iconBg: manualBg,
    },
    {
      key: 'scan',
      icon: 'scan-outline' as const,
      label: t('quick.scan'),
      onPress: onScan,
      iconColor: scanIcon,
      iconBg: scanBg,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.quick_entry')}
      </Text>
      <View style={styles.grid}>
        {entries.map(entry => (
          <TouchableOpacity
            key={entry.key}
            style={[styles.entryButton, { backgroundColor: colors.surface, borderColor: colors.divider }]}
            onPress={entry.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: entry.iconBg }]}>
              <Ionicons name={entry.icon} size={20} color={entry.iconColor} />
            </View>
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {entry.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  entryButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
