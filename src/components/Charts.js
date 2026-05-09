import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from './AppIcon';

// ─────────────────────────────────────────────────────────────
// BarChart — vertical bars with labels + optional value markers
// ─────────────────────────────────────────────────────────────
export function BarChart({
  data,            // [{ label, value }]
  color,
  gradient,        // [c1, c2] — optional, renders gradient bars
  height = 140,
  showValues = false,
  showLabels = true,
  labelColor,
  labelEvery = 1,  // show every Nth label
}) {
  const { theme } = useTheme();
  const effectiveLabelColor = labelColor || theme.textMuted;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * (height - (showValues ? 22 : 10)));
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {showValues && d.value > 0 && (
                <Text style={{ fontSize: 9, color: effectiveLabelColor, marginBottom: 2 }}>{d.value}</Text>
              )}
              <View style={{ width: '100%', height: h, borderRadius: 5, overflow: 'hidden' }}>
                {gradient ? (
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: color,
                      opacity: 0.4 + 0.6 * (d.value / max),
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      {showLabels && (
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
          {data.map((d, i) => (
            <Text
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 9,
                color: effectiveLabelColor,
                fontWeight: '600',
              }}
              numberOfLines={1}
            >
              {i % labelEvery === 0 ? d.label : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// HorizontalBar — labeled horizontal bar row
// ─────────────────────────────────────────────────────────────
export function HorizontalBar({
  icon,
  label,
  value,
  maxValue,
  color,
  trackColor,
  textColor,
  mutedColor,
}) {
  const { theme } = useTheme();
  const track = trackColor || theme.inputBg;
  const txt = textColor || theme.text;
  const muted = mutedColor || theme.textMuted;
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.hbarRow}>
      <View style={styles.hbarHead}>
        <AppIcon name={icon} size={15} color={color || txt} />
        <Text style={[styles.hbarLabel, { color: txt }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.hbarValue, { color: muted }]}>{value}</Text>
      </View>
      <View style={[styles.hbarTrack, { backgroundColor: track }]}>
        <View
          style={[
            styles.hbarFill,
            { backgroundColor: color, width: `${Math.min(100, pct)}%` },
          ]}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// HourlyHeatmap — 24 cells showing activity by hour of day
// ─────────────────────────────────────────────────────────────
export function HourlyHeatmap({ data, color, cellSize = 12 }) {
  const { theme } = useTheme();
  // data: [{ hour: 0-23, count: n }]
  const counts = new Array(24).fill(0);
  data.forEach((d) => {
    if (d.hour != null) counts[d.hour] = d.count;
  });
  const max = Math.max(1, ...counts);

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {counts.map((c, h) => {
          const intensity = c / max;
          return (
            <View key={h} style={{ alignItems: 'center', width: cellSize + 6 }}>
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellSize / 2,
                  backgroundColor: color,
                  opacity: c === 0 ? 0.08 : 0.25 + 0.75 * intensity,
                }}
              />
              {h % 6 === 0 && (
                <Text style={[styles.hourLabel, { color: theme.textMuted }]}>{h}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// WeekdayPattern — Mon..Sun stacked bars aggregated from daily data
// ─────────────────────────────────────────────────────────────
export function WeekdayPattern({ daily, color, height = 100 }) {
  // daily: [{ date: 'YYYY-MM-DD', completed: n }]
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byDow = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 .. Sun=6
  daily.forEach((d) => {
    if (!d.date) return;
    const dt = new Date(d.date);
    const jsDow = dt.getDay(); // 0=Sun..6=Sat
    const mondayFirst = (jsDow + 6) % 7;
    byDow[mondayFirst] += d.completed || 0;
  });

  return (
    <BarChart
      data={DAYS.map((label, i) => ({ label, value: byDow[i] }))}
      color={color}
      height={height}
      showValues
    />
  );
}

// ─────────────────────────────────────────────────────────────
// StreakCalendar — last N days as a grid (heatmap style)
// ─────────────────────────────────────────────────────────────
export function StreakCalendar({ daily, days = 30, color }) {
  // Build lookup from date → completed count
  const map = {};
  daily.forEach((d) => {
    if (d.date) map[d.date] = d.completed || 0;
  });
  const max = Math.max(1, ...Object.values(map));
  const cells = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const count = map[key] || 0;
    cells.push({ date: dt, count, key });
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {cells.map((c) => {
        const intensity = c.count / max;
        return (
          <View
            key={c.key}
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              backgroundColor: color,
              opacity: c.count === 0 ? 0.08 : 0.25 + 0.75 * intensity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ProgressRing — semicircle arc using transform trick (no SVG)
// Shows a horizontal gradient track with a circular thumb indicator.
// ─────────────────────────────────────────────────────────────
export function ProgressBar({
  value,      // 0-100
  gradient,   // [c1, c2]
  height = 10,
  trackColor,
}) {
  const { theme } = useTheme();
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: trackColor || theme.inputBg, overflow: 'hidden' }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${pct}%`, borderRadius: height / 2 }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MoodTrendLine — vertical colored bars per day showing mood strength
// ─────────────────────────────────────────────────────────────
export function MoodTrendLine({ data, height = 80, moodColors }) {
  const { theme } = useTheme();
  // data: [{ date, mood, count }]
  if (!data || data.length === 0) return null;
  // Score: positive=1, neutral=0, negative=-1
  const positive = new Set(['amazing', 'happy', 'excited', 'loved', 'grateful']);
  const negative = new Set(['sad', 'angry', 'anxious', 'tired']);

  // Aggregate by date — one dominant mood per day
  const byDate = {};
  data.forEach((d) => {
    if (!byDate[d.date]) byDate[d.date] = { mood: d.mood, count: d.count };
    else if (d.count > byDate[d.date].count) byDate[d.date] = { mood: d.mood, count: d.count };
  });
  const dates = Object.keys(byDate).sort();

  const mid = height / 2;
  return (
    <View style={{ height }}>
      <View style={{ position: 'absolute', top: mid - 1, left: 0, right: 0, height: 1, backgroundColor: theme.glassBorder }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {dates.map((date, i) => {
          const { mood } = byDate[date];
          const score = positive.has(mood) ? 1 : negative.has(mood) ? -1 : 0;
          const barHeight = Math.abs(score) * (mid - 4);
          const color = moodColors[mood] || '#888';
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height }}>
              {score >= 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: mid,
                    width: 6,
                    height: score === 0 ? 4 : barHeight,
                    borderRadius: 3,
                    backgroundColor: color,
                  }}
                />
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    top: mid,
                    width: 6,
                    height: barHeight,
                    borderRadius: 3,
                    backgroundColor: color,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hbarRow: { marginBottom: 12 },
  hbarHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  hbarLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  hbarValue: { fontSize: 12, fontWeight: '700' },
  hbarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 4 },
  hourLabel: { fontSize: 9, marginTop: 3 },
});
