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
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, total, currencySymbol }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

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
        <View style={styles.centerLabel}>
          <Text style={[styles.centerTotal, { color: colors.text }]}>
            {currencySymbol}0.00
          </Text>
          <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
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
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.centerLabel}>
        <Text style={[styles.centerTotal, { color: colors.text }]}>
          {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
          {t('stats.total_expense')}
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
