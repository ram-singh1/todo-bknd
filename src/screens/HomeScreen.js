import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import PremiumBadge from '../components/PremiumBadge';
import FadeInView from '../components/FadeInView';
import PressScale from '../components/PressScale';
import AnimatedCounter from '../components/AnimatedCounter';
import api from '../api/client';
import { format } from 'date-fns';

function ProgressRing({ percent, size = 120, stroke = 10, theme }) {
  // CSS-only ring without SVG: a rotating gradient masked by a centered card.
  // Visually conveys progress 0–100% with a satisfying fill arc.
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(Math.max(0, Math.min(100, percent)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(animated.value / 100) * 360}deg` }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: theme.inputBg,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          rotateStyle,
        ]}
      >
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size / 2,
            height: size,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderTopLeftRadius: size / 2,
            borderBottomLeftRadius: size / 2,
            opacity: 0.9,
          }}
        />
      </Animated.View>
      <View
        style={{
          width: size - stroke * 2,
          height: size - stroke * 2,
          borderRadius: (size - stroke * 2) / 2,
          backgroundColor: theme.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatedCounter
          value={Math.round(percent)}
          suffix="%"
          style={{ fontSize: 24, fontWeight: '800', color: theme.text }}
        />
        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1 }}>
          DONE
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isLight = theme.mode === 'light';
  const { user } = useAuth();
  const { isPremium, plan, daysUntilExpiry, trialUsed } = useSubscription();
  const [todoStats, setTodoStats] = useState(null);
  const [diaryStats, setDiaryStats] = useState(null);
  const [recentTodos, setRecentTodos] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [todosRes, diaryRes, recentRes, summaryRes] = await Promise.all([
        api.get('/todos/stats').catch(() => ({ data: { stats: null } })),
        api.get('/diary/stats').catch(() => ({ data: { stats: null } })),
        api.get('/todos?limit=4&completed=false&sortBy=createdAt&order=desc').catch(() => ({ data: { todos: [] } })),
        api.get('/analytics/summary').catch(() => ({ data: { summary: null } })),
      ]);
      setTodoStats(todosRes.data.stats);
      setDiaryStats(diaryRes.data.stats);
      setRecentTodos(recentRes.data.todos || []);
      setSummary(summaryRes.data.summary);
      api.post('/analytics/heartbeat').catch(() => {});
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '🌅' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  };

  const greeting = getGreeting();
  const streak = summary?.streak?.current || diaryStats?.streak || 0;
  const completionRate = todoStats?.completionRate || 0;
  const pending = todoStats?.pending || 0;
  const completed = todoStats?.completed || 0;
  const entries = diaryStats?.total || 0;

  // Theme-aware glass for floating header buttons.
  const iconBtnBg = isLight ? 'rgba(15,23,42,0.05)' : theme.glass;
  const iconBtnBorder = isLight ? 'rgba(15,23,42,0.10)' : theme.glassBorder;

  // Bottom padding so the floating tab bar (70px dock + 18px float) doesn't
  // hide the last card.
  const bottomPad = insets.bottom + 100;

  const quickActions = [
    {
      key: 'task',
      label: 'New Task',
      icon: 'add-circle',
      gradient: [theme.primary, theme.secondary],
      onPress: () => navigation.navigate('AddTodo'),
    },
    {
      key: 'diary',
      label: 'Write Diary',
      icon: 'book',
      gradient: [theme.secondary, theme.accent],
      onPress: () => navigation.navigate('AddDiary'),
    },
    {
      key: 'habits',
      label: 'Habits',
      icon: 'flame',
      gradient: ['#F97316', theme.warning],
      onPress: () => navigation.navigate('Habits'),
    },
    {
      key: 'braindump',
      label: 'Brain Dump',
      icon: 'flash',
      gradient: [theme.accent, theme.primary],
      onPress: () => navigation.navigate('BrainDump'),
    },
    {
      key: 'focus',
      label: 'Focus',
      icon: 'timer',
      gradient: [theme.primary, theme.accent],
      onPress: () => navigation.navigate('Focus'),
    },
    {
      key: 'calendar',
      label: 'Calendar',
      icon: 'calendar',
      gradient: [theme.secondary, theme.primary],
      onPress: () => navigation.navigate('Calendar'),
    },
  ];

  return (
    <LiquidBackground>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <FadeInView delay={0}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                {greeting.emoji} {greeting.text}
              </Text>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                  {user?.name || 'Friend'}
                </Text>
                <PremiumBadge size="small" />
              </View>
              <Text style={[styles.dateText, { color: theme.textMuted }]}>
                {format(new Date(), 'EEEE · MMMM d')}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <PressScale
                style={[styles.iconBtn, { backgroundColor: iconBtnBg, borderColor: iconBtnBorder }]}
                onPress={() => navigation.navigate('Search')}
                accessibilityLabel="Open search"
              >
                <Ionicons name="search" size={20} color={theme.text} />
              </PressScale>
              <PressScale
                style={[styles.iconBtn, { backgroundColor: iconBtnBg, borderColor: iconBtnBorder, overflow: 'hidden' }]}
                onPress={() => navigation.navigate('Profile')}
                accessibilityLabel="Open profile"
              >
                {user?.avatar?.startsWith('__photo_') ? (
                  <Image
                    source={{ uri: user.avatar.replace('__photo_', '') }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : user?.avatar?.startsWith('__icon_') ? (() => {
                  const iconId = user.avatar.replace('__icon_', '');
                  const ICON_MAP = {
                    person: { icon: 'person', color: '#6366F1' },
                    rocket: { icon: 'rocket', color: '#EC4899' },
                    planet: { icon: 'planet', color: '#8B5CF6' },
                    leaf: { icon: 'leaf', color: '#10B981' },
                    flame: { icon: 'flame', color: '#F97316' },
                    star: { icon: 'star', color: '#FBBF24' },
                    diamond: { icon: 'diamond', color: '#38BDF8' },
                    rose: { icon: 'rose', color: '#F43F5E' },
                  };
                  const def = ICON_MAP[iconId] || { icon: 'person', color: theme.primary };
                  return <Ionicons name={def.icon} size={22} color={def.color} />;
                })() : (
                  <Text style={{ fontSize: 22 }}>
                    {user?.avatar?.length <= 2 ? user.avatar : '😀'}
                  </Text>
                )}
              </PressScale>
            </View>
          </View>
        </FadeInView>

        {/* Hero progress card */}
        <FadeInView delay={80}>
          <GlassCard variant="solid" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroLabel, { color: theme.textMuted }]}>TODAY'S FOCUS</Text>
                <Text style={[styles.heroHeadline, { color: theme.text }]}>
                  {pending === 0 && completed === 0
                    ? 'No tasks yet'
                    : pending === 0
                    ? 'All done. Nice.'
                    : `${pending} task${pending === 1 ? '' : 's'} to go`}
                </Text>
                <View style={styles.heroChips}>
                  <View style={[styles.heroChip, { backgroundColor: `${theme.primary}1F`, borderColor: `${theme.primary}55` }]}>
                    <Ionicons name="flame" size={12} color={theme.warning} />
                    <Text style={[styles.heroChipText, { color: theme.text }]}>
                      {streak} day streak
                    </Text>
                  </View>
                  {completed > 0 && (
                    <View style={[styles.heroChip, { backgroundColor: `${theme.success}1F`, borderColor: `${theme.success}55` }]}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                      <Text style={[styles.heroChipText, { color: theme.text }]}>
                        {completed} done
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <ProgressRing percent={completionRate} theme={theme} />
            </View>
          </GlassCard>
        </FadeInView>

        {/* Trial / upgrade banner */}
        {!isPremium && !trialUsed && (
          <FadeInView delay={120}>
            <PressScale onPress={() => navigation.navigate('Upgrade')} minScale={0.98}>
              <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trialBanner}
              >
                <Text style={styles.trialEmoji}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trialTitle}>Try Pro free for 7 days</Text>
                  <Text style={styles.trialDesc}>
                    Unlimited tasks · Lock diary · Cloud backup
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" />
              </LinearGradient>
            </PressScale>
          </FadeInView>
        )}

        {isPremium && daysUntilExpiry != null && daysUntilExpiry <= 3 && (
          <FadeInView delay={120}>
            <GlassCard variant="accent" style={{ marginBottom: 16 }}>
              <View style={styles.trialRow}>
                <Text style={styles.trialEmoji}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trialTitleDark, { color: theme.text }]}>
                    {plan === 'trial' ? 'Trial' : 'Plan'} ends in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}
                  </Text>
                  <Text style={[styles.trialDescDark, { color: theme.textSecondary }]}>
                    Renew to keep your access.
                  </Text>
                </View>
                <PressScale
                  style={[styles.renewBtn, { backgroundColor: theme.primary }]}
                  onPress={() => navigation.navigate('Upgrade')}
                >
                  <Text style={styles.renewText}>Renew</Text>
                </PressScale>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* Quick stats strip */}
        <FadeInView delay={160}>
          <View style={styles.statsStrip}>
            <StatPill label="Pending" value={pending} color={theme.primary} theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <StatPill label="Done" value={completed} color={theme.success} theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <StatPill label="Entries" value={entries} color={theme.secondary} theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <StatPill label="Streak" value={streak} color={theme.warning} theme={theme} suffix="🔥" />
          </View>
        </FadeInView>

        {/* Quick actions grid (gradient tiles, 2-col horizontal layout).
            The width % must live on a plain View that's a direct flex child
            of the grid — putting it on PressScale's inner Animated.View
            doesn't propagate through the wrapping Pressable, which is why
            tiles collapse to content size. */}
        <FadeInView delay={200}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Quick actions</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((a) => (
              <View key={a.key} style={styles.actionTile}>
                <PressScale style={styles.actionTileFill} onPress={a.onPress}>
                  <LinearGradient
                    colors={a.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionTileInner}
                  >
                    <View style={styles.actionIconCircle}>
                      <Ionicons name={a.icon} size={20} color="#FFFFFF" />
                    </View>
                    <Text
                      style={styles.actionTileText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {a.label}
                    </Text>
                  </LinearGradient>
                </PressScale>
              </View>
            ))}
          </View>
        </FadeInView>

        {/* Upcoming tasks */}
        {recentTodos.length > 0 && (
          <FadeInView delay={240}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 0 }]}>
                Upcoming
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See all →</Text>
              </TouchableOpacity>
            </View>
            {recentTodos.map((todo, i) => (
              <FadeInView key={todo._id} delay={260 + i * 40}>
                <GlassCard variant="light" style={styles.todoItem}>
                  <View style={styles.todoRow}>
                    <Text style={styles.todoEmoji}>{todo.emoji || '📝'}</Text>
                    <View style={styles.todoInfo}>
                      <Text style={[styles.todoTitle, { color: theme.text }]} numberOfLines={1}>
                        {todo.title}
                      </Text>
                      <Text style={[styles.todoMeta, { color: theme.textMuted }]}>
                        {todo.category} · {todo.priority}
                        {todo.dueDate ? ` · ${format(new Date(todo.dueDate), 'MMM d')}` : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityDot,
                        {
                          backgroundColor:
                            todo.priority === 'critical' ? theme.danger :
                            todo.priority === 'high' ? '#F97316' :
                            todo.priority === 'medium' ? theme.warning : theme.success,
                        },
                      ]}
                    />
                  </View>
                </GlassCard>
              </FadeInView>
            ))}
          </FadeInView>
        )}

        {recentTodos.length === 0 && pending === 0 && completed === 0 && (
          <FadeInView delay={240}>
            <GlassCard variant="light" style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Your day is a blank canvas
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Tap "New Task" or "Write Diary" above to begin.
              </Text>
            </GlassCard>
          </FadeInView>
        )}
      </ScrollView>
    </LiquidBackground>
  );
}

function StatPill({ label, value, color, theme, suffix }) {
  return (
    <View style={styles.statPill}>
      <View style={styles.statPillTopRow}>
        <AnimatedCounter
          value={value || 0}
          style={[styles.statPillValue, { color }]}
        />
        {suffix && <Text style={styles.statPillSuffix}>{suffix}</Text>}
      </View>
      <Text style={[styles.statPillLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  greeting: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  userName: { fontSize: 26, fontWeight: '800', maxWidth: 220 },
  dateText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  heroCard: { marginBottom: 16, paddingVertical: 20, paddingHorizontal: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  heroHeadline: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 12 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  heroChipText: { fontSize: 11, fontWeight: '700' },

  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 22,
    marginBottom: 16,
  },
  trialEmoji: { fontSize: 24 },
  trialTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  trialDesc: { color: 'rgba(255,255,255,0.86)', fontSize: 12, marginTop: 2 },
  trialTitleDark: { fontSize: 14, fontWeight: '800' },
  trialDescDark: { fontSize: 12, marginTop: 2 },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  renewBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  renewText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    marginBottom: 18,
  },
  statPill: { flex: 1, alignItems: 'center' },
  statPillTopRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statPillValue: { fontSize: 20, fontWeight: '800' },
  statPillSuffix: { fontSize: 14 },
  statPillLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, height: 28 },

  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 12, letterSpacing: 0.2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: '700' },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  // 2-column horizontal pill layout — guarantees labels like
  // "New Task" / "Write Diary" / "Brain Dump" fit on a single line.
  actionTile: {
    width: '48.5%',
    marginBottom: 4,
    borderRadius: 22,
    overflow: 'hidden',
  },
  // PressScale's inner Animated.View must stretch the full tile width;
  // without this it collapses to icon+label content size.
  actionTileFill: {
    width: '100%',
  },
  actionTileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 64,
    gap: 12,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    flexShrink: 1,
  },

  todoItem: { marginBottom: 8 },
  todoRow: { flexDirection: 'row', alignItems: 'center' },
  todoEmoji: { fontSize: 22, marginRight: 12 },
  todoInfo: { flex: 1 },
  todoTitle: { fontSize: 14, fontWeight: '700' },
  todoMeta: { fontSize: 12, marginTop: 3 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },

  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
