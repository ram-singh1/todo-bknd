import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import PremiumBadge from '../components/PremiumBadge';
import {
  BarChart,
  HorizontalBar,
  HourlyHeatmap,
  WeekdayPattern,
  StreakCalendar,
  ProgressBar,
  MoodTrendLine,
} from '../components/Charts';
import api from '../api/client';
import { moodConfig, categoryConfig, priorityConfig } from '../themes';

const RANGES = [
  { key: 7, label: '7D' },
  { key: 30, label: '30D' },
  { key: 90, label: '90D' },
];

const MOOD_EMOJI_COLOR = Object.fromEntries(
  Object.entries(moodConfig).map(([k, v]) => [k, v.color])
);

function SectionTitle({ icon, title, subtitle, color, subColor }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSub, { color: subColor || theme.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }) {
  const { theme } = useTheme();
  const { isPremium, showPaywall } = useSubscription();

  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [moodTrends, setMoodTrends] = useState(null);
  const [insights, setInsights] = useState(null);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    if (!isPremium) showPaywall('analytics');
    load();
  }, [range, isPremium]);

  const load = async () => {
    try {
      const summaryRes = await api.get('/analytics/summary');
      setSummary(summaryRes.data.summary);
      if (isPremium) {
        const [prod, trends, ins] = await Promise.all([
          api.get(`/analytics/productivity?days=${range}`),
          api.get(`/analytics/mood-trends?days=${range}`),
          api.get('/analytics/insights'),
        ]);
        setProductivity(prod.data.productivity);
        setMoodTrends(trends.data.moodTrends);
        setInsights(ins.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── Derived data ─────────────────────────────────────────
  const dailyData = useMemo(() => {
    const daily = productivity?.daily || [];
    // Build continuous date series so gaps render as zero bars
    const map = Object.fromEntries(daily.map((d) => [d.date, d.completed]));
    const now = new Date();
    const points = [];
    for (let i = range - 1; i >= 0; i--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      points.push({
        label: dt.getDate().toString(),
        date: key,
        completed: map[key] || 0,
        value: map[key] || 0,
      });
    }
    return points;
  }, [productivity, range]);

  const totalCompleted = useMemo(
    () => dailyData.reduce((s, d) => s + d.completed, 0),
    [dailyData]
  );
  const avgPerDay = range > 0 ? (totalCompleted / range).toFixed(1) : 0;
  const bestDay = useMemo(() => {
    if (!dailyData.length) return null;
    return dailyData.reduce((a, b) => (a.completed >= b.completed ? a : b));
  }, [dailyData]);

  const maxCategory = Math.max(1, ...(productivity?.byCategory || []).map((c) => c.count));
  const maxPriority = Math.max(1, ...(productivity?.byPriority || []).map((p) => p.count));
  const maxMood = Math.max(1, ...(moodTrends?.distribution || []).map((m) => m.count));

  const completionRate = summary?.todos?.completionRate || 0;

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Insights</Text>
        <PremiumBadge size="small" />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fade }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Range toggle */}
        <View style={[styles.rangeRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.rangeBtn, range === r.key && { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.rangeText, { color: range === r.key ? '#fff' : theme.textSecondary }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero: Completion rate */}
        <GlassCard variant="solid" glow style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
                OVERALL COMPLETION
              </Text>
              <Text style={[styles.heroValue, { color: theme.text }]}>
                {completionRate}<Text style={{ fontSize: 20, color: theme.textMuted }}>%</Text>
              </Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                {summary?.todos?.completed || 0} of {summary?.todos?.total || 0} tasks done
              </Text>
            </View>
            <View style={styles.heroRight}>
              <Text style={[styles.heroRightValue, { color: theme.warning }]}>
                🔥 {summary?.streak?.current || 0}
              </Text>
              <Text style={[styles.heroRightLabel, { color: theme.textMuted }]}>
                day streak
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <ProgressBar
              value={completionRate}
              gradient={[theme.primary, theme.secondary]}
              trackColor={theme.inputBg}
            />
          </View>
        </GlassCard>

        {/* Quick stats row */}
        <View style={styles.tileRow}>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.success }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{totalCompleted}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Done ({range}d)</Text>
          </GlassCard>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.primary }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{avgPerDay}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Avg / day</Text>
          </GlassCard>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.warning }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{summary?.streak?.longest || 0}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Best streak</Text>
          </GlassCard>
        </View>

        <View style={styles.tileRow}>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.secondary }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{summary?.diary?.total || 0}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Entries</Text>
          </GlassCard>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.accent || theme.primary }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{summary?.diary?.totalWords || 0}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Words</Text>
          </GlassCard>
          <GlassCard variant="light" style={[styles.tile, { borderLeftWidth: 3, borderLeftColor: theme.danger }]}>
            <Text style={[styles.tileValue, { color: theme.text }]}>{summary?.todos?.overdue || 0}</Text>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>Overdue</Text>
          </GlassCard>
        </View>

        {/* Insights */}
        {isPremium && insights?.insights?.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionTitle icon="📌" title="Helpful Insights" subtitle="Smart observations from your data" color={theme.text} subColor={theme.textMuted} />
            {insights.insights.map((ins, i) => {
              const severityColor =
                ins.severity === 'positive' ? theme.success
                : ins.severity === 'warning' ? theme.warning
                : theme.primary;
              return (
                <GlassCard key={i} variant="solid" style={styles.insightCard}>
                  <View style={[styles.insightDot, { backgroundColor: severityColor }]} />
                  <View style={styles.insightBody}>
                    <View style={styles.insightHead}>
                      <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                      <Text style={[styles.insightTitle, { color: theme.text }]}>{ins.title}</Text>
                    </View>
                    <Text style={[styles.insightDesc, { color: theme.textSecondary }]}>
                      {ins.description}
                    </Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {!isPremium && (
          <GlassCard variant="accent" glow style={{ marginTop: 20 }}>
            <Text style={[styles.lockTitle, { color: theme.text }]}>🔒 Unlock full insights</Text>
            <Text style={[styles.lockText, { color: theme.textSecondary }]}>
              Upgrade to Pro to unlock daily charts, hourly heatmap, weekday patterns, mood trends,
              streak calendar, and deeper productivity insights.
            </Text>
            <GlassButton
              title="Upgrade to Pro"
              onPress={() => navigation.navigate('Upgrade')}
              icon="sparkles"
              fullWidth
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        )}

        {/* Daily productivity chart */}
        {isPremium && dailyData.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="📈"
              title="Daily completions"
              subtitle={bestDay ? `Best: ${bestDay.completed} tasks` : `Last ${range} days`}
              color={theme.text}
            />
            <BarChart
              data={dailyData}
              gradient={[theme.primary, theme.secondary]}
              height={130}
              labelEvery={Math.ceil(range / 8)}
              labelColor={theme.textMuted}
            />
          </GlassCard>
        )}

        {/* Hourly heatmap */}
        {isPremium && productivity?.byHour?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="⏱️"
              title="When you're productive"
              subtitle={
                productivity.peakHour != null
                  ? `Peak hour: ${productivity.peakHour}:00 – ${productivity.peakHour + 1}:00`
                  : 'Hour-of-day pattern'
              }
              color={theme.text}
            />
            <HourlyHeatmap data={productivity.byHour} color={theme.primary} />
          </GlassCard>
        )}

        {/* Weekday pattern */}
        {isPremium && dailyData.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="📆"
              title="Weekday pattern"
              subtitle="Total completions by day of week"
              color={theme.text}
            />
            <WeekdayPattern
              daily={productivity?.daily || []}
              color={theme.secondary}
              height={110}
            />
          </GlassCard>
        )}

        {/* 30-day activity calendar */}
        {isPremium && dailyData.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="🗓️"
              title="Activity calendar"
              subtitle="Last 30 days"
              color={theme.text}
            />
            <StreakCalendar
              daily={productivity?.daily || []}
              days={30}
              color={theme.primary}
            />
            <View style={styles.legendBar}>
              <Text style={[styles.legendBarText, { color: theme.textMuted }]}>Less</Text>
              {[0.15, 0.35, 0.6, 0.85, 1].map((op) => (
                <View
                  key={op}
                  style={[styles.legendBarCell, { backgroundColor: theme.primary, opacity: op }]}
                />
              ))}
              <Text style={[styles.legendBarText, { color: theme.textMuted }]}>More</Text>
            </View>
          </GlassCard>
        )}

        {/* Category breakdown */}
        {isPremium && productivity?.byCategory?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="🏷️"
              title="Tasks by category"
              subtitle={`${productivity.byCategory.reduce((s, c) => s + c.count, 0)} completed`}
              color={theme.text}
            />
            {productivity.byCategory.map((c, i) => {
              const cat = categoryConfig[c.category] || { emoji: '📁', label: c.category, color: '#888' };
              return (
                <HorizontalBar
                  key={i}
                  icon={cat.emoji}
                  label={cat.label}
                  value={c.count}
                  maxValue={maxCategory}
                  color={cat.color}
                  trackColor={theme.inputBg}
                  textColor={theme.text}
                  mutedColor={theme.textMuted}
                />
              );
            })}
          </GlassCard>
        )}

        {/* Priority breakdown */}
        {isPremium && productivity?.byPriority?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="🎯"
              title="By priority level"
              subtitle="What you're tackling"
              color={theme.text}
            />
            {productivity.byPriority.map((p, i) => {
              const pri = priorityConfig[p.priority] || { label: p.priority, color: '#888' };
              return (
                <HorizontalBar
                  key={i}
                  icon={p.priority === 'critical' ? '🚨' : p.priority === 'high' ? '⚡' : p.priority === 'medium' ? '📍' : '🌱'}
                  label={pri.label}
                  value={p.count}
                  maxValue={maxPriority}
                  color={pri.color}
                  trackColor={theme.inputBg}
                  textColor={theme.text}
                  mutedColor={theme.textMuted}
                />
              );
            })}
          </GlassCard>
        )}

        {/* Mood distribution */}
        {isPremium && moodTrends?.distribution?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="😊"
              title="Mood distribution"
              subtitle={
                moodTrends.averageScore
                  ? `Avg mood score: ${moodTrends.averageScore} / 5`
                  : `${moodTrends.totalEntries || 0} entries`
              }
              color={theme.text}
            />
            {moodTrends.distribution.map((m, i) => {
              const mood = moodConfig[m.mood] || { emoji: '💭', label: m.mood, color: '#888' };
              return (
                <HorizontalBar
                  key={i}
                  icon={mood.emoji}
                  label={mood.label}
                  value={m.count}
                  maxValue={maxMood}
                  color={mood.color}
                  trackColor={theme.inputBg}
                  textColor={theme.text}
                  mutedColor={theme.textMuted}
                />
              );
            })}
          </GlassCard>
        )}

        {/* Mood trend */}
        {isPremium && moodTrends?.byDay?.length > 0 && (
          <GlassCard variant="solid" style={styles.chartCard}>
            <SectionTitle
              icon="〰️"
              title="Mood trend"
              subtitle="Above line = positive · below = tough days"
              color={theme.text}
            />
            <MoodTrendLine
              data={moodTrends.byDay}
              height={90}
              moodColors={MOOD_EMOJI_COLOR}
            />
          </GlassCard>
        )}

        {loading && (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  rangeRow: {
    flexDirection: 'row', padding: 4, borderRadius: 999,
    borderWidth: 1, alignSelf: 'center', marginBottom: 16,
  },
  rangeBtn: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 999 },
  rangeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  hero: { marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  heroValue: { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  heroSub: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  heroRight: { alignItems: 'flex-end', paddingTop: 18 },
  heroRightValue: { fontSize: 24, fontWeight: '800' },
  heroRightLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },

  tileRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tile: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  tileValue: { fontSize: 20, fontWeight: '800' },
  tileLabel: { fontSize: 10, marginTop: 4, fontWeight: '700', letterSpacing: 0.3 },

  lockTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  lockText: { fontSize: 14, lineHeight: 20 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },

  chartCard: { marginTop: 14 },

  insightCard: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  insightDot: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  insightBody: { flex: 1 },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  insightEmoji: { fontSize: 18 },
  insightTitle: { fontSize: 15, fontWeight: '700' },
  insightDesc: { fontSize: 13, lineHeight: 18 },

  legendBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12,
    justifyContent: 'flex-end',
  },
  legendBarText: { fontSize: 10, fontWeight: '600', marginHorizontal: 4 },
  legendBarCell: { width: 14, height: 14, borderRadius: 3 },
});
