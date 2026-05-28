import React, { useState } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius } from '@/constants/theme';

export interface TrendChartPoint {
  label: string; // e.g. "05-28" or "Jan"
  value: number;
}

interface TrendChartProps {
  data: TrendChartPoint[];
  currencySymbol: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, currencySymbol }) => {
  const colors = useThemeColors();
  const [containerWidth, setContainerWidth] = useState<number>(300);

  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  // If no data or all values are zero
  const allZero = data.every(d => d.value === 0);
  if (data.length === 0 || allZero) {
    return (
      <View style={styles.emptyContainer} onLayout={onLayout}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          暂无该周期内的消费趋势数据
        </Text>
      </View>
    );
  }

  // Find boundaries
  const maxVal = Math.max(...data.map(d => d.value));
  const maxValue = maxVal > 0 ? maxVal * 1.15 : 100; // Add 15% headroom for aesthetic spacing

  // Coordinate getters
  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingBottom - (val / maxValue) * chartHeight;
  };

  // Build SVG Path strings
  let linePath = '';
  let areaPath = '';

  data.forEach((d, idx) => {
    const x = getX(idx);
    const y = getY(d.value);
    if (idx === 0) {
      linePath = `M ${x} ${y}`;
    } else {
      linePath += ` L ${x} ${y}`;
    }
  });

  if (data.length > 0) {
    const firstX = getX(0);
    const lastX = getX(data.length - 1);
    const bottomY = height - paddingBottom;
    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Find max point to put a highlight circle
  let maxIdx = 0;
  let currentMax = -1;
  data.forEach((d, idx) => {
    if (d.value > currentMax) {
      currentMax = d.value;
      maxIdx = idx;
    }
  });

  const shouldShowLabel = (idx: number, total: number) => {
    if (total <= 7) return true;
    if (total <= 12) return idx % 2 === 0 || idx === total - 1;
    if (total <= 31) return idx % 5 === 0 || idx === total - 1;
    return idx % 10 === 0 || idx === total - 1;
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Svg width={containerWidth} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.24} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Y Axis Grid Lines & Labels */}
        {[0, 0.5, 1].map((ratio) => {
          const val = maxValue * ratio;
          const y = getY(val);
          return (
            <G key={`grid-${ratio}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={containerWidth - paddingRight}
                y2={y}
                stroke={colors.divider}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={paddingLeft - 8}
                y={y + 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="end"
                fontWeight="500"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
              </SvgText>
            </G>
          );
        })}

        {/* Gradient Area under curve */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Smooth line */}
        <Path
          d={linePath}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Highlight Highest Point */}
        {data.length > 0 && maxVal > 0 && (
          <G>
            <Circle
              cx={getX(maxIdx)}
              cy={getY(currentMax)}
              r={6}
              fill={colors.primary}
              stroke={colors.background}
              strokeWidth={2}
            />
            <Circle
              cx={getX(maxIdx)}
              cy={getY(currentMax)}
              r={12}
              fill={colors.primary}
              opacity={0.15}
            />
          </G>
        )}

        {/* X Axis Labels */}
        {data.map((d, idx) => {
          if (!shouldShowLabel(idx, data.length)) return null;
          return (
            <SvgText
              key={`x-${idx}`}
              x={getX(idx)}
              y={height - 6}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="middle"
              fontWeight="500"
            >
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
