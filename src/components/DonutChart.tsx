import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface DonutChartItem {
  key: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  data: DonutChartItem[];
  total: number;
  currencySymbol: string;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  total,
  currencySymbol,
  selectedKey = null,
  onSelectKey,
  size = 180,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const strokeWidth = size * 0.133; // Keep proportional to size
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const translateCategoryName = (nameKey: string) => {
    return nameKey.startsWith('category.') ? t(nameKey) : nameKey;
  };

  // Find selected item details if any
  const selectedItem = data.find((item) => item.key === selectedKey);

  // If no data, render a gray circle
  if (total === 0 || data.length === 0) {
    return (
      <View style={styles.container}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.surfaceElevated}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          </G>
        </Svg>
        <View style={[styles.centerLabel, { width: size * 0.7, height: size * 0.7 }]}>
          <Text style={[styles.centerTotal, { color: colors.text, fontSize: size * 0.09 }]}>
            {currencySymbol}0.00
          </Text>
          <Text style={[styles.centerSub, { color: colors.textSecondary, fontSize: size * 0.06 }]}>
            {t('stats.no_data')}
          </Text>
        </View>
      </View>
    );
  }

  let accumulatedPercentage = 0;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {data.map((item, index) => {
            const percentage = item.percentage / 100;
            const strokeLength = percentage * circumference;
            const rotationOffset = (accumulatedPercentage * 360);
            
            accumulatedPercentage += percentage;

            const isSelected = selectedKey === item.key;
            const isAnySelected = selectedKey !== null;
            const strokeOpacity = !isAnySelected || isSelected ? 1 : 0.35;

            return (
              <Circle
                key={item.key || index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${strokeLength} ${circumference}`}
                transform={`rotate(${rotationOffset} ${size / 2} ${size / 2})`}
                opacity={strokeOpacity}
                onPress={() => onSelectKey?.(isSelected ? null : item.key)}
              />
            );
          })}
        </G>
      </Svg>

      <View style={[styles.centerLabel, { width: size * 0.7, height: size * 0.7 }]}>
        <Text style={[styles.centerTotal, { color: colors.text, fontSize: selectedItem ? size * 0.09 : size * 0.09 }]}>
          {selectedItem
            ? `${currencySymbol}${selectedItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `${currencySymbol}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </Text>
        <Text style={[styles.centerSub, { color: colors.textSecondary, fontSize: size * 0.058 }]} numberOfLines={2}>
          {selectedItem
            ? `${translateCategoryName(selectedItem.name)}\n(${selectedItem.percentage.toFixed(1)}%)`
            : t('stats.total_expense')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  centerTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centerSub: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
