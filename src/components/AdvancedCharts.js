// Themed wrappers around react-native-gifted-charts. Every chart pulls its
// stroke / gradient / muted text from useTheme so a theme switch repaints
// every visualization with no per-screen code.
//
// Imports are scoped to the components actually used to keep bundle weight
// down on screens that only need one chart.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PieChart as GPieChart,
  LineChart as GLineChart,
  BarChart as GBarChart,
} from 'react-native-gifted-charts';
import { useTheme } from '../contexts/ThemeContext';

// ─── DonutChart ────────────────────────────────────────────────
// data: [{ value, color, label, gradientCenterColor? }]
// centerLabel/centerValue overlay rendered via radius math
export function DonutChart({
  data, size = 180, innerRadius = 56, centerValue, centerLabel,
  hideText = false,
}) {
  const { theme } = useTheme();
  const safeData = (data && data.length > 0)
    ? data
    : [{ value: 1, color: theme.inputBg }];
  const radius = size / 2;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <GPieChart
        data={safeData.map((d) => ({
          ...d,
          gradientCenterColor: d.gradientCenterColor || d.color,
        }))}
        donut
        radius={radius}
        innerRadius={innerRadius}
        innerCircleColor={'transparent'}
        innerCircleBorderWidth={0}
        focusOnPress={false}
        textColor={theme.text}
        textSize={11}
        showText={!hideText}
        backgroundColor={'transparent'}
        centerLabelComponent={() => (
          <View style={{ alignItems: 'center' }}>
            {centerValue !== undefined && (
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>
                {centerValue}
              </Text>
            )}
            {centerLabel && (
              <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 }}>
                {centerLabel}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

// ─── AreaChart ─────────────────────────────────────────────────
// values: [number] — drawn as a smooth area with gradient fill.
// secondary (optional): [number] of equal length renders a 2nd series.
export function AreaChart({
  values = [],
  labels = [],
  secondary = null,
  primaryColor,
  secondaryColor,
  height = 170,
  showYLabels = true,
  curved = true,
  yAxisFormat,
}) {
  const { theme } = useTheme();
  const pColor = primaryColor || theme.primary;
  const sColor = secondaryColor || theme.success;

  const items = useMemo(() => values.map((v, i) => ({
    value: v,
    label: labels[i] || '',
    dataPointText: '',
  })), [values, labels]);

  const items2 = useMemo(() => secondary ? secondary.map((v, i) => ({
    value: v, label: labels[i] || '',
  })) : null, [secondary, labels]);

  if (!values.length) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>No data yet</Text>
      </View>
    );
  }

  const maxV = Math.max(1, ...values, ...(secondary || []));

  return (
    <GLineChart
      areaChart
      curved={curved}
      data={items}
      data2={items2}
      height={height}
      hideRules
      hideYAxisText={!showYLabels}
      yAxisColor={'transparent'}
      xAxisColor={`${theme.glassBorder}`}
      verticalLinesColor={'transparent'}
      yAxisTextStyle={{ color: theme.textMuted, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: theme.textMuted, fontSize: 9 }}
      color={pColor}
      color2={sColor}
      thickness={2}
      thickness2={2}
      startFillColor={pColor}
      endFillColor={pColor}
      startFillColor2={sColor}
      endFillColor2={sColor}
      startOpacity={0.45}
      endOpacity={0.02}
      startOpacity2={0.35}
      endOpacity2={0.02}
      noOfSections={4}
      maxValue={Math.ceil(maxV * 1.1)}
      formatYLabel={yAxisFormat}
      initialSpacing={6}
      endSpacing={6}
      hideDataPoints
      focusEnabled
      backgroundColor="transparent"
      adjustToWidth
    />
  );
}

// ─── SparkLine ────────────────────────────────────────────────
// Tiny inline chart for cards. No axes, just the curve.
export function SparkLine({ values = [], color, height = 40, width = 110 }) {
  const { theme } = useTheme();
  const c = color || theme.primary;
  if (!values.length) return <View style={{ height, width }} />;
  const items = values.map((v) => ({ value: v }));
  const maxV = Math.max(1, ...values);

  return (
    <View pointerEvents="none">
      <GLineChart
        areaChart
        curved
        data={items}
        height={height}
        width={width}
        hideRules
        hideYAxisText
        hideAxesAndRules
        xAxisColor="transparent"
        yAxisColor="transparent"
        color={c}
        thickness={1.6}
        startFillColor={c}
        endFillColor={c}
        startOpacity={0.45}
        endOpacity={0.02}
        initialSpacing={0}
        endSpacing={0}
        maxValue={maxV}
        hideDataPoints
        backgroundColor="transparent"
        adjustToWidth
        disableScroll
      />
    </View>
  );
}

// ─── MultiBar (paired bars per category) ──────────────────────
// data: [{ label, primary, secondary }]
export function MultiBar({
  data = [],
  primaryColor, secondaryColor,
  primaryLabel = 'Income', secondaryLabel = 'Expense',
  height = 180,
}) {
  const { theme } = useTheme();
  const pColor = primaryColor || theme.success;
  const sColor = secondaryColor || theme.danger;

  const flat = useMemo(() => {
    const out = [];
    data.forEach((d) => {
      out.push({
        value: d.primary, label: d.label,
        spacing: 2, frontColor: pColor, gradientColor: pColor,
        topLabelComponent: () => null,
      });
      out.push({
        value: d.secondary, frontColor: sColor, gradientColor: sColor,
      });
    });
    return out;
  }, [data, pColor, sColor]);

  if (!data.length) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>No data</Text>
      </View>
    );
  }

  const maxV = Math.max(1, ...data.flatMap((d) => [d.primary, d.secondary]));

  return (
    <View>
      <GBarChart
        data={flat}
        height={height}
        barWidth={14}
        spacing={18}
        roundedTop
        roundedBottom={false}
        hideRules
        xAxisColor={`${theme.glassBorder}`}
        yAxisColor={'transparent'}
        yAxisTextStyle={{ color: theme.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.textMuted, fontSize: 10 }}
        noOfSections={4}
        maxValue={Math.ceil(maxV * 1.1)}
        backgroundColor="transparent"
        showGradient
        gradientColor={pColor}
        initialSpacing={8}
        adjustToWidth
        isAnimated
      />
      <View style={styles.legend}>
        <Legend color={pColor} label={primaryLabel} />
        <Legend color={sColor} label={secondaryLabel} />
      </View>
    </View>
  );
}

// ─── GoalRing (single-value progress arc with a label) ────────
export function GoalRing({
  value = 0, target = 100, size = 110, color, trackColor, label, sublabel,
}) {
  const { theme } = useTheme();
  const c = color || theme.primary;
  const track = trackColor || theme.inputBg;
  const pct = Math.max(0, Math.min(100, target > 0 ? (value / target) * 100 : 0));
  const data = [
    { value: pct, color: c, gradientCenterColor: c },
    { value: Math.max(0, 100 - pct), color: track },
  ];
  return (
    <View style={{ alignItems: 'center' }}>
      <GPieChart
        data={data}
        donut
        radius={size / 2}
        innerRadius={(size / 2) * 0.7}
        innerCircleColor={'transparent'}
        innerCircleBorderWidth={0}
        focusOnPress={false}
        showText={false}
        backgroundColor={'transparent'}
        centerLabelComponent={() => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: size * 0.18, fontWeight: '800' }}>
              {Math.round(pct)}%
            </Text>
            {label && (
              <Text style={{ color: theme.textMuted, fontSize: 9, fontWeight: '700', marginTop: 1, letterSpacing: 0.4 }}>
                {label}
              </Text>
            )}
          </View>
        )}
      />
      {sublabel && (
        <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6, fontWeight: '600' }}>
          {sublabel}
        </Text>
      )}
    </View>
  );
}

// ─── Stacked horizontal bar — share of total per category ─────
// data: [{ label, value, color }]
export function ShareBar({ data = [], height = 12 }) {
  const { theme } = useTheme();
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  return (
    <View>
      <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: theme.inputBg }}>
        {data.map((d, i) => {
          const w = (d.value / total) * 100;
          if (w <= 0) return null;
          return (
            <View
              key={i}
              style={{ width: `${w}%`, backgroundColor: d.color || theme.primary }}
            />
          );
        })}
      </View>
      <View style={[styles.legend, { marginTop: 10 }]}>
        {data.map((d, i) => (
          <Legend key={i} color={d.color || theme.primary} label={`${d.label}`} />
        ))}
      </View>
    </View>
  );
}

function Legend({ color, label }) {
  const { theme } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
