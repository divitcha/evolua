import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, G } from "react-native-svg";
import { useTheme } from "../theme";

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface EvolutionChartProps {
  title: string;
  subtitle?: string;
  dataSeries: {
    name: string;
    color: string;
    data: TimeSeriesPoint[];
    unit: string;
  }[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  testID?: string;
}

const RANGES = [
  { id: "30d", label: "30D" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "12m", label: "12M" },
  { id: "todos", label: "Todos" },
];

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  title,
  subtitle,
  dataSeries,
  selectedRange = "todos",
  onRangeChange,
  testID = "evolution-chart",
}) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.min(screenWidth - 48, 380);
  const chartHeight = 180;
  const paddingHorizontal = 32;
  const paddingTop = 20;
  const paddingBottom = 28;

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [activeRange, setActiveRange] = useState(selectedRange);

  const handleRange = (r: string) => {
    setActiveRange(r);
    if (onRangeChange) onRangeChange(r);
  };

  // Find overall min and max across all series
  const allValues = dataSeries
    .flatMap((s) => s.data.map((p) => p.value))
    .filter((v) => Number.isFinite(v));
  if (allValues.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
          Dados insuficientes para renderizar gráfico.
        </Text>
      </View>
    );
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const rangeDiff = rawMax - rawMin === 0 ? 10 : rawMax - rawMin;
  const minY = Math.max(0, Math.floor(rawMin - rangeDiff * 0.15));
  const maxY = Math.ceil(rawMax + rangeDiff * 0.15);

  const usableWidth = chartWidth - paddingHorizontal * 2;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const dates = dataSeries[0]?.data.map((p) => p.date) || [];
  const pointCount = dates.length;

  const safeNum = (n: number, fallback: number) =>
    Number.isFinite(n) ? n : fallback;

  const getX = (index: number) => {
    if (pointCount <= 1) return paddingHorizontal + usableWidth / 2;
    return safeNum(
      paddingHorizontal + (index / (pointCount - 1)) * usableWidth,
      paddingHorizontal + usableWidth / 2
    );
  };

  const getY = (val: number) => {
    const mid = paddingTop + usableHeight / 2;
    if (maxY === minY || !Number.isFinite(val)) return mid;
    return safeNum(
      paddingTop + usableHeight - ((val - minY) / (maxY - minY)) * usableHeight,
      mid
    );
  };

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text testID={`${testID}-title`} style={[styles.title, { color: colors.onSurface }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>

        {/* Range Selector */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const isSel = activeRange === r.id;
            return (
              <Pressable
                key={r.id}
                testID={`${testID}-range-${r.id}`}
                onPress={() => handleRange(r.id)}
                style={[
                  styles.rangeButton,
                  {
                    backgroundColor: isSel ? colors.brandPrimary : colors.surfaceTertiary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rangeText,
                    {
                      color: isSel ? colors.onBrandPrimary : colors.onSurfaceSecondary,
                      fontWeight: isSel ? "700" : "500",
                    },
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Series Legend */}
      <View style={styles.legendRow}>
        {dataSeries.map((s, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={[styles.legendText, { color: colors.onSurfaceSecondary }]}>
              {s.name} ({s.unit})
            </Text>
          </View>
        ))}
      </View>

      {/* SVG Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <G>
            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = paddingTop + usableHeight * (1 - ratio);
              const gridVal = Math.round(minY + (maxY - minY) * ratio);
              return (
                <G key={i}>
                  <Line
                    x1={paddingHorizontal}
                    y1={y}
                    x2={chartWidth - paddingHorizontal}
                    y2={y}
                    stroke={colors.border}
                    strokeDasharray="4, 4"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={paddingHorizontal - 6}
                    y={y + 4}
                    fill={colors.muted}
                    fontSize="10"
                    textAnchor="end"
                  >
                    {gridVal}
                  </SvgText>
                </G>
              );
            })}

            {/* Paths for each series */}
            {dataSeries.map((series, sIdx) => {
              if (series.data.length === 0) return null;
              let pathD = "";
              series.data.forEach((pt, idx) => {
                const x = getX(idx);
                const y = getY(pt.value);
                if (idx === 0) {
                  pathD += `M ${x} ${y}`;
                } else {
                  const prevX = getX(idx - 1);
                  const prevY = getY(series.data[idx - 1].value);
                  const cp1x = prevX + (x - prevX) / 2;
                  const cp2x = cp1x;
                  pathD += ` C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
                }
              });

              return (
                <G key={sIdx}>
                  <Path
                    d={pathD}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {series.data.map((pt, pIdx) => {
                    const x = getX(pIdx);
                    const y = getY(pt.value);
                    const isSelected = selectedPointIndex === pIdx;
                    return (
                      <Circle
                        key={pIdx}
                        cx={x}
                        cy={y}
                        r={isSelected ? 5 : 4}
                        fill={colors.surfaceSecondary}
                        stroke={series.color}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    );
                  })}
                </G>
              );
            })}

            {/* Date labels on X axis */}
            {dates.map((d, idx) => {
              const x = getX(idx);
              const formattedDate = d.length > 5 ? d.substring(5).replace("-", "/") : d;
              return (
                <SvgText
                  key={idx}
                  x={x}
                  y={chartHeight - 6}
                  fill={selectedPointIndex === idx ? colors.brandPrimary : colors.muted}
                  fontSize="10"
                  fontWeight={selectedPointIndex === idx ? "bold" : "normal"}
                  textAnchor="middle"
                >
                  {formattedDate}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 4,
  },
  rangeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rangeText: {
    fontSize: 11,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 12,
  },
});
