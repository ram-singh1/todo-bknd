import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import PressScale from '../components/PressScale';
import api from '../api/client';
import { format } from 'date-fns';

const HEATMAP_DAYS = 84; // 12 weeks visible

function buildHeatmap(checkInsSet) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, date: d, filled: checkInsSet.has(key) });
  }
  return out;
}

export default function HabitDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [habit, setHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const habitId = route.params?.id;

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/habits/${habitId}`);
      setHabit(res.data.habit);
    } catch (e) {
      Alert.alert('Error', 'Could not load habit.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [habitId, navigation]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = async (key) => {
    if (!habit) return;
    const checked = habit.checkIns?.includes(key);
    try {
      await Haptics.selectionAsync();
      const res = checked
        ? await api.delete(`/habits/${habit._id}/checkin`, { data: { date: key } })
        : await api.post(`/habits/${habit._id}/checkin`, { date: key });
      setHabit(res.data.habit);
    } catch {}
  };

  const handleDelete = () => {
    Alert.alert('Delete habit?', 'This will also remove all check-ins.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/habits/${habit._id}`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          } catch {}
        },
      },
    ]);
  };

  if (loading || !habit) {
    return (
      <LiquidBackground>
        <View style={[styles.loading, { paddingTop: insets.top }]}>
          <Text style={{ color: theme.textMuted }}>Loading...</Text>
        </View>
      </LiquidBackground>
    );
  }

  const set = new Set(habit.checkIns || []);
  const heatmap = buildHeatmap(set);
  // Group into 12 columns of 7 cells (Mon..Sun) for the calendar look.
  const weeks = [];
  for (let i = 0; i < heatmap.length; i += 7) {
    weeks.push(heatmap.slice(i, i + 7));
  }

  const total = habit.checkIns?.length || 0;
  const last30 = heatmap.slice(-30).filter((d) => d.filled).length;
  const rate30 = Math.round((last30 / 30) * 100);
  const current = habit.streak?.current || 0;
  const longest = habit.streak?.longest || 0;

  return (
    <LiquidBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddHabit', { habit })}
          style={styles.backBtn}
        >
          <Ionicons name="create-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <GlassCard variant="solid" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.emojiBubble, { backgroundColor: `${habit.color}25`, borderColor: `${habit.color}55` }]}>
              <Text style={styles.emojiText}>{habit.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={2}>
                {habit.name}
              </Text>
              {habit.description ? (
                <Text style={[styles.habitDesc, { color: theme.textMuted }]} numberOfLines={3}>
                  {habit.description}
                </Text>
              ) : null}
            </View>
          </View>
        </GlassCard>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: theme.warning }]}>{current}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Current</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{longest}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Longest</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statValue, { color: theme.success }]}>{total}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{rate30}%</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>30 days</Text>
          </GlassCard>
        </View>

        {/* Heatmap */}
        <GlassCard variant="solid" style={styles.heatCard}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Last 12 weeks</Text>
            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
              Tap any cell to toggle a check-in
            </Text>
          </View>
          <View style={styles.heatWrap}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.heatCol}>
                {week.map((cell) => (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor: cell.filled ? habit.color : theme.inputBg,
                        borderColor: cell.key === heatmap[heatmap.length - 1].key
                          ? habit.color
                          : 'transparent',
                        borderWidth: cell.key === heatmap[heatmap.length - 1].key ? 1.5 : 0,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleDay(cell.key)}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Less</Text>
            {[0.2, 0.4, 0.7, 1].map((op) => (
              <View key={op} style={[styles.legendCell, { backgroundColor: habit.color, opacity: op }]} />
            ))}
            <Text style={[styles.legendText, { color: theme.textMuted }]}>More</Text>
          </View>
        </GlassCard>

        {/* Created info */}
        <Text style={[styles.metaText, { color: theme.textMuted }]}>
          Started {format(new Date(habit.createdAt), 'MMM d, yyyy')}
        </Text>

        <PressScale
          style={[styles.deleteBtn, { borderColor: theme.danger }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
          <Text style={[styles.deleteText, { color: theme.danger }]}>Delete habit</Text>
        </PressScale>
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  scroll: { paddingHorizontal: 18 },

  heroCard: { padding: 18, marginBottom: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiBubble: {
    width: 64, height: 64, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiText: { fontSize: 32 },
  habitName: { fontSize: 20, fontWeight: '800' },
  habitDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    marginBottom: 16,
  },
  statTile: { width: '48%', alignItems: 'center', paddingVertical: 14, marginBottom: 10 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 },

  heatCard: { padding: 16, marginBottom: 16 },
  sectionHead: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  heatWrap: { flexDirection: 'row', justifyContent: 'space-between' },
  heatCol: { gap: 4 },
  heatCell: { width: 18, height: 18, borderRadius: 5 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, justifyContent: 'flex-end' },
  legendText: { fontSize: 10, fontWeight: '700' },
  legendCell: { width: 12, height: 12, borderRadius: 3 },

  metaText: { fontSize: 12, textAlign: 'center', marginVertical: 8 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
    marginTop: 8, marginBottom: 24,
  },
  deleteText: { fontSize: 13, fontWeight: '700' },
});
