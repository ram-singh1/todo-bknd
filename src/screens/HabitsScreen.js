import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import FadeInView from '../components/FadeInView';
import PressScale from '../components/PressScale';
import AnimatedCounter from '../components/AnimatedCounter';
import api from '../api/client';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function last7Days() {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      isToday: i === 0,
    });
  }
  return out;
}

export default function HabitsScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPaywall } = useSubscription();
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [habitsRes, statsRes] = await Promise.all([
        api.get('/habits'),
        api.get('/habits/stats').catch(() => ({ data: { stats: null } })),
      ]);
      setHabits(habitsRes.data.habits || []);
      setStats(statsRes.data.stats);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleCheckIn = async (habit, dateKey) => {
    const checked = habit.checkIns?.includes(dateKey);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = checked
        ? await api.delete(`/habits/${habit._id}/checkin`, { data: { date: dateKey } })
        : await api.post(`/habits/${habit._id}/checkin`, { date: dateKey });
      // Update locally so the dot fills instantly
      setHabits((prev) =>
        prev.map((h) => (h._id === habit._id ? res.data.habit : h))
      );
      // Refetch stats so the top counter updates
      api.get('/habits/stats').then((r) => setStats(r.data.stats)).catch(() => {});
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not update check-in';
      Alert.alert('Oops', msg);
    }
  };

  const deleteHabit = (habit) => {
    Alert.alert('Delete habit?', `"${habit.name}" and all its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/habits/${habit._id}`);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            load();
          } catch {}
        },
      },
    ]);
  };

  const handleNew = async () => {
    try {
      // Pre-flight free-tier cap so we paywall before pushing the form.
      // Server still enforces, but this avoids the dead-end form.
      navigation.navigate('AddHabit');
    } catch (e) {
      if (e?.response?.data?.code === 'PREMIUM_REQUIRED') {
        showPaywall('habits', e.response.data.message);
      }
    }
  };

  const days = last7Days();
  const today = todayKey();

  return (
    <LiquidBackground>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <FadeInView>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Habits</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Small consistent steps. Big change.
              </Text>
            </View>
            <PressScale
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={handleNew}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </PressScale>
          </View>
        </FadeInView>

        {/* Top stats */}
        <FadeInView delay={60}>
          <GlassCard variant="solid" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <AnimatedCounter
                  value={stats?.doneToday || 0}
                  style={[styles.statNum, { color: theme.success }]}
                />
                <Text style={[styles.statLbl, { color: theme.textMuted }]}>DONE TODAY</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
              <View style={styles.statCol}>
                <AnimatedCounter
                  value={stats?.bestStreak || 0}
                  style={[styles.statNum, { color: theme.warning }]}
                />
                <Text style={[styles.statLbl, { color: theme.textMuted }]}>BEST STREAK 🔥</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
              <View style={styles.statCol}>
                <AnimatedCounter
                  value={stats?.completionRate || 0}
                  suffix="%"
                  style={[styles.statNum, { color: theme.primary }]}
                />
                <Text style={[styles.statLbl, { color: theme.textMuted }]}>TODAY</Text>
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Empty state */}
        {!loading && habits.length === 0 && (
          <FadeInView delay={120}>
            <GlassCard variant="light" style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Plant your first habit
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Pick something small. Drink water. 5 push-ups. A page of a book.
              </Text>
              <PressScale
                style={[styles.emptyCta, { backgroundColor: theme.primary }]}
                onPress={handleNew}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>Create habit</Text>
              </PressScale>
            </GlassCard>
          </FadeInView>
        )}

        {/* Habit list */}
        {habits.map((habit, i) => {
          const checkedToday = habit.checkIns?.includes(today);
          const current = habit.streak?.current || 0;
          return (
            <FadeInView key={habit._id} delay={120 + i * 50}>
              <GlassCard variant="light" style={styles.habitCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('HabitDetail', { id: habit._id })}
                  onLongPress={() => deleteHabit(habit)}
                >
                  <View style={styles.habitTop}>
                    <View style={[styles.habitIcon, { backgroundColor: `${habit.color}25`, borderColor: `${habit.color}55` }]}>
                      <Text style={styles.habitEmoji}>{habit.emoji || '🎯'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <Text style={[styles.habitMeta, { color: theme.textMuted }]} numberOfLines={1}>
                        {habit.frequency === 'daily' ? 'Every day' : `${habit.weeklyTarget || 7}× / week`}
                        {current > 0 ? ` · ${current} day streak 🔥` : ''}
                      </Text>
                    </View>
                    <PressScale
                      style={[
                        styles.checkBig,
                        {
                          backgroundColor: checkedToday ? habit.color : 'transparent',
                          borderColor: checkedToday ? habit.color : theme.glassBorder,
                        },
                      ]}
                      onPress={() => toggleCheckIn(habit, today)}
                      accessibilityLabel={checkedToday ? 'Uncheck today' : 'Check in for today'}
                    >
                      <Ionicons
                        name={checkedToday ? 'checkmark' : 'checkmark-outline'}
                        size={22}
                        color={checkedToday ? '#FFFFFF' : theme.textMuted}
                      />
                    </PressScale>
                  </View>

                  {/* Last 7 days */}
                  <View style={styles.weekRow}>
                    {days.map((d) => {
                      const filled = habit.checkIns?.includes(d.key);
                      return (
                        <TouchableOpacity
                          key={d.key}
                          style={styles.dayCell}
                          activeOpacity={0.7}
                          onPress={() => toggleCheckIn(habit, d.key)}
                        >
                          <View
                            style={[
                              styles.dayDot,
                              {
                                backgroundColor: filled ? habit.color : theme.inputBg,
                                borderColor: d.isToday ? habit.color : 'transparent',
                                borderWidth: d.isToday ? 1.5 : 0,
                              },
                            ]}
                          />
                          <Text style={[styles.dayLbl, { color: theme.textMuted }]}>{d.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              </GlassCard>
            </FadeInView>
          );
        })}
      </ScrollView>

      {/* FAB */}
      {habits.length > 0 && (
        <PressScale
          style={[styles.fab, { bottom: insets.bottom + 100 }]}
          onPress={handleNew}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            style={styles.fabInner}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </PressScale>
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  statsCard: { marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, height: 32 },

  habitCard: { marginBottom: 12, paddingVertical: 14 },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  habitIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  habitEmoji: { fontSize: 24 },
  habitName: { fontSize: 15, fontWeight: '700' },
  habitMeta: { fontSize: 12, marginTop: 2 },
  checkBig: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { flex: 1, alignItems: 'center', gap: 4 },
  dayDot: {
    width: 22, height: 22, borderRadius: 11,
  },
  dayLbl: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 14, paddingHorizontal: 24 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
  },
  emptyCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56, height: 56, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 8,
  },
  fabInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
