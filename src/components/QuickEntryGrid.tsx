import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

interface QuickEntryGridProps {
  onVoice: () => void;
  onManual: () => void;
  onScan: () => void;
}

export function QuickEntryGrid({ onVoice, onManual, onScan }: QuickEntryGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const entries = [
    { key: 'voice', icon: 'mic-outline' as const, label: t('quick.voice'), onPress: onVoice },
    { key: 'manual', icon: 'create-outline' as const, label: t('quick.manual'), onPress: onManual },
    { key: 'scan', icon: 'scan-outline' as const, label: t('quick.scan'), onPress: onScan },
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
            style={[styles.entryButton, { backgroundColor: colors.surface }, Shadows.card]}
            onPress={entry.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name={entry.icon} size={24} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{entry.label}</Text>
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  entryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: BorderRadius.lg,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
