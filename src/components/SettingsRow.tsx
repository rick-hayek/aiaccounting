import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SettingsRowProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showDivider?: boolean;
  rightElement?: React.ReactNode;
}

export function SettingsRow({
  iconName,
  iconBgColor,
  label,
  value,
  onPress,
  showChevron = true,
  showDivider = true,
  rightElement,
}: SettingsRowProps) {
  const colors = useThemeColors();

  const RowContent = (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {value ? (
        <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>
      ) : null}
      {rightElement}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.chevron} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {RowContent}
        </TouchableOpacity>
      ) : (
        <View>{RowContent}</View>
      )}
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    marginRight: Spacing.one,
  },
  chevron: {
    marginLeft: Spacing.one,
  },
  divider: {
    height: 1,
    marginLeft: 36 + Spacing.three * 2, // align with start of label text
  },
});
