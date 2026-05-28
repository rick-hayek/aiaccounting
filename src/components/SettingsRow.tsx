import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/theme';

interface SettingsRowProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor?: string; // kept for backward compat but ignored in new flat style
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showDivider?: boolean;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

export function SettingsRow({
  iconName,
  label,
  value,
  onPress,
  showChevron = true,
  showDivider = true,
  rightElement,
  destructive = false,
}: SettingsRowProps) {
  const colors = useThemeColors();
  const iconColor = destructive ? colors.expense : colors.textSecondary;

  const RowContent = (
    <View style={styles.container}>
      <Ionicons name={iconName} size={22} color={iconColor} style={styles.icon} />
      <Text style={[styles.label, { color: destructive ? colors.expense : colors.text }]}>{label}</Text>
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
        <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
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
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  icon: {
    width: 28,
    textAlign: 'center',
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  value: {
    fontSize: 14,
    fontWeight: '400',
    marginRight: Spacing.one,
  },
  chevron: {
    marginLeft: Spacing.one,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 28 + 14 + Spacing.three, // icon width + icon marginRight + container paddingHorizontal
  },
});
