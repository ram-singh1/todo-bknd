import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import api from '../api/client';
import { format } from 'date-fns';

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your mind is a garden, your thoughts are the seeds.", author: "Unknown" },
  { text: "Every day is a fresh start.", author: "Unknown" },
  { text: "Be the energy you want to attract.", author: "Unknown" },
  { text: "Small steps every day lead to big changes.", author: "Unknown" },
  { text: "You are capable of amazing things.", author: "Unknown" },
  { text: "Inhale confidence, exhale doubt.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "The only limit is your mind.", author: "Unknown" },
  { text: "Stars can't shine without darkness.", author: "D.H. Sidebottom" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
];

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [todoStats, setTodoStats] = useState(null);
  const [diaryStats, setDiaryStats] = useState(null);
  const [recentTodos, setRecentTodos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Floating orb animations
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(orb1, { toValue: 1, duration: 6000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(orb2, { toValue: 1, duration: 8000, useNativeDriver: true })).start();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [todosRes, diaryRes, recentRes] = await Promise.all([
        api.get('/todos/stats').catch(() => ({ data: { stats: null } })),
        api.get('/diary/stats').catch(() => ({ data: { stats: null } })),
        api.get('/todos?limit=5&completed=false&sortBy=createdAt&order=desc').catch(() => ({ data: { todos: [] } })),
      ]);
      setTodoStats(todosRes.data.stats);
      setDiaryStats(diaryRes.data.stats);
      setRecentTodos(recentRes.data.todos || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
    if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
    if (hour < 21) return { text: 'Good Evening', emoji: '🌆' };
    return { text: 'Good Night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      {/* Floating decorative orbs */}
      <Animated.View style={[styles.orb, {
        backgroundColor: `${theme.primary}15`,
        top: 80, left: -40,
        transform: [{ translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
      }]} />
      <Animated.View style={[styles.orb2, {
        backgroundColor: `${theme.secondary}10`,
        top: 300, right: -60,
        transform: [{ translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }],
      }]} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              {greeting.emoji} {greeting.text}
            </Text>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.name || 'User'} ✨
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarButton, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={{ fontSize: 22 }}>
              {user?.avatar?.length <= 2 ? user.avatar : '😀'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date */}
        <Text style={[styles.dateText, { color: theme.textMuted }]}>
          📅 {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <GlassCard variant="accent" style={styles.statCard} glow>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {todoStats?.pending || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
          </GlassCard>

          <GlassCard variant="default" style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statNumber, { color: theme.success }]}>
              {todoStats?.completed || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Done</Text>
          </GlassCard>

          <GlassCard variant="default" style={styles.statCard}>
            <Text style={styles.statEmoji}>📔</Text>
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {diaryStats?.total || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Entries</Text>
          </GlassCard>

          <GlassCard variant="default" style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statNumber, { color: theme.warning }]}>
              {diaryStats?.streak || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
          </GlassCard>
        </View>

        {/* Completion Progress */}
        {todoStats && todoStats.total > 0 && (
          <GlassCard variant="solid" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: theme.text }]}>Today's Progress</Text>
              <Text style={[styles.progressPercent, { color: theme.primary }]}>
                {todoStats.completionRate}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.inputBg }]}>
              <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${todoStats.completionRate}%` }]}
              />
            </View>
            <Text style={[styles.progressSubtext, { color: theme.textMuted }]}>
              {todoStats.completed} of {todoStats.total} tasks completed
              {todoStats.overdue > 0 ? ` · ${todoStats.overdue} overdue` : ''}
            </Text>
          </GlassCard>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <GlassCard
              variant="accent"
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddTodo')}
              glow
            >
              <Text style={styles.actionEmoji}>✏️</Text>
              <Text style={[styles.actionText, { color: theme.text }]}>New Task</Text>
            </GlassCard>
            <GlassCard
              variant="default"
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddTodo', { aiMode: true })}
            >
              <Text style={styles.actionEmoji}>🤖</Text>
              <Text style={[styles.actionText, { color: theme.text }]}>AI Generate</Text>
            </GlassCard>
            <GlassCard
              variant="default"
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddDiary')}
            >
              <Text style={styles.actionEmoji}>📖</Text>
              <Text style={[styles.actionText, { color: theme.text }]}>Write Diary</Text>
            </GlassCard>
          </View>
        </View>

        {/* Recent Tasks */}
        {recentTodos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentTodos.map((todo) => (
              <GlassCard key={todo._id} variant="light" style={styles.todoItem}>
                <View style={styles.todoRow}>
                  <Text style={styles.todoEmoji}>{todo.emoji || '📝'}</Text>
                  <View style={styles.todoInfo}>
                    <Text
                      style={[styles.todoTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {todo.title}
                    </Text>
                    <Text style={[styles.todoMeta, { color: theme.textMuted }]}>
                      {todo.category} · {todo.priority}
                      {todo.dueDate ? ` · ${format(new Date(todo.dueDate), 'MMM d')}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.priorityDot, {
                    backgroundColor:
                      todo.priority === 'critical' ? theme.danger :
                      todo.priority === 'high' ? '#F97316' :
                      todo.priority === 'medium' ? theme.warning : theme.success,
                  }]} />
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Motivational Card */}
        <GlassCard variant="accent" style={styles.motivationCard} glow>
          <Text style={styles.motivationEmoji}>💫</Text>
          <Text style={[styles.motivationText, { color: theme.text }]}>
            "{quote.text}"
          </Text>
          <Text style={[styles.motivationAuthor, { color: theme.textSecondary }]}>
            — {quote.author}
          </Text>
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: { fontSize: 15, fontWeight: '500' },
  userName: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  avatarButton: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  dateText: { fontSize: 13, marginBottom: 26, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
    marginBottom: 22,
  },
  statCard: {
    flexBasis: '48%',
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  progressCard: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700' },
  progressPercent: { fontSize: 18, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSubtext: { fontSize: 12, marginTop: 8 },
  quickActions: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  actionCard: {
    flexBasis: '32%',
    minWidth: 100,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 18,
  },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  todoItem: { marginBottom: 8 },
  todoRow: { flexDirection: 'row', alignItems: 'center' },
  todoEmoji: { fontSize: 22, marginRight: 12 },
  todoInfo: { flex: 1 },
  todoTitle: { fontSize: 15, fontWeight: '600' },
  todoMeta: { fontSize: 12, marginTop: 3 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  motivationCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  motivationEmoji: { fontSize: 32, marginBottom: 12 },
  motivationText: { fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 24, fontStyle: 'italic' },
  motivationAuthor: { fontSize: 13, marginTop: 8, fontWeight: '500' },
});
