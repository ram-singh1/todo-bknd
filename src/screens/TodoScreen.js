import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import SwipeableRow from '../components/SwipeableRow';
import SnoozeSheet from '../components/SnoozeSheet';
import AppIcon from '../components/AppIcon';
import { cancelSmartRepeat } from '../utils/notifications';
import api from '../api/client';
import { categoryConfig, priorityConfig } from '../themes';
import { format } from 'date-fns';

const FILTERS = ['All', 'Pending', 'Completed', 'Overdue'];
const CATEGORIES = ['all', ...Object.keys(categoryConfig)];

export default function TodoScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('All');
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const tabDockBottom = Math.max(insets.bottom + 10, Platform.OS === 'ios' ? 14 : 16);
  const tabDockHeight = 72;
  const fabBottom = tabDockBottom + tabDockHeight + 16;
  const listBottomPad = fabBottom + 84;

  // Manual ordering only makes sense for the pending-all view; in any other
  // filter we sort by created/due so users see a stable, sensible order.
  const canReorder = filter === 'Pending' && category === 'all';

  const loadTodos = useCallback(async () => {
    try {
      const params = canReorder
        ? { limit: 100, sortBy: 'order', order: 'asc' }
        : { limit: 100, sortBy: 'createdAt', order: 'desc' };
      if (filter === 'Pending') params.completed = 'false';
      if (filter === 'Completed') params.completed = 'true';
      if (category !== 'all') params.category = category;

      const [todosRes, statsRes] = await Promise.all([
        api.get('/todos', { params }),
        api.get('/todos/stats').catch(() => ({ data: { stats: null } })),
      ]);

      let items = todosRes.data.todos || [];
      if (filter === 'Overdue') {
        items = items.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
      }
      setTodos(items);
      setStats(statsRes.data.stats);
    } catch {} finally {
      setLoading(false);
    }
  }, [filter, category, canReorder]);

  const persistReorder = useCallback(async (data) => {
    try {
      await api.post('/todos/reorder', { ids: data.map((t) => t._id) });
    } catch {}
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTodos);
    return unsubscribe;
  }, [navigation, loadTodos]);

  const toggleComplete = async (todo) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await api.put(`/todos/${todo._id}`, { completed: !todo.completed });
      // When marking complete, kill any pending smart-repeat nudges so the
      // user isn't pinged about a task they've finished.
      if (!todo.completed) {
        cancelSmartRepeat(todo._id).catch(() => {});
      }
      loadTodos();
    } catch {}
  };

  const deleteTodo = (todo) => {
    Alert.alert('Delete Task', `Delete "${todo.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/todos/${todo._id}`);
            // Same cleanup on delete — orphan notifications are bad UX.
            cancelSmartRepeat(todo._id).catch(() => {});
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadTodos();
          } catch {}
        },
      },
    ]);
  };

  const snoozeTodo = async (mins) => {
    if (!snoozeTarget) return;
    const nowDue = snoozeTarget.dueDate ? new Date(snoozeTarget.dueDate) : new Date();
    const newDue = new Date(Math.max(Date.now(), nowDue.getTime()) + mins * 60000);
    try {
      const updates = { dueDate: newDue.toISOString() };
      if (snoozeTarget.reminder?.enabled && snoozeTarget.reminder?.advanceMinutes != null) {
        updates.reminder = {
          ...snoozeTarget.reminder,
          time: new Date(newDue.getTime() - snoozeTarget.reminder.advanceMinutes * 60000).toISOString(),
          sent: false,
        };
      }
      await api.put(`/todos/${snoozeTarget._id}`, updates);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTodos();
    } catch {} finally {
      setSnoozeTarget(null);
    }
  };

  // DraggableFlatList passes (item, drag, isActive). Plain map passes item.
  // We support both signatures by destructuring with safe fallbacks.
  const renderTodo = ({ item: todo, drag, isActive }) => {
    const cat = categoryConfig[todo.category] || categoryConfig.general;
    const pri = priorityConfig[todo.priority] || priorityConfig.medium;
    const isOverdue = !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

    return (
      <SwipeableRow
        onComplete={() => toggleComplete(todo)}
        onDelete={() => deleteTodo(todo)}
        completedLabel={todo.completed ? 'Undo' : 'Done'}
      >
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => {
          // In reorder-able view: long-press starts drag. Elsewhere: snooze.
          if (canReorder && drag) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSnoozeTarget(todo);
          }
        }}
        style={isActive ? { opacity: 0.85, transform: [{ scale: 1.02 }] } : null}
      >
      <GlassCard
        variant={todo.completed ? 'light' : 'default'}
        style={[styles.todoCard, isOverdue && { borderColor: theme.danger }]}
      >
        <View style={styles.todoRow}>
          <TouchableOpacity
            onPress={() => toggleComplete(todo)}
            style={[
              styles.checkbox,
              {
                borderColor: todo.completed ? theme.success : pri.color,
                backgroundColor: todo.completed ? theme.success : 'transparent',
              },
            ]}
          >
            {todo.completed && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </TouchableOpacity>

          <View style={styles.todoContent}>
            <View style={styles.todoTitleRow}>
              <AppIcon name={todo.emoji || cat.icon} size={18} color={cat.color} style={styles.todoEmoji} />
              <Text
                style={[
                  styles.todoTitle,
                  { color: theme.text },
                  todo.completed && { textDecorationLine: 'line-through', color: theme.textMuted },
                ]}
                numberOfLines={2}
              >
                {todo.title}
              </Text>
            </View>

            <View style={styles.todoMeta}>
              <View style={[styles.badge, { backgroundColor: `${cat.color}20` }]}>
                <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${pri.color}20` }]}>
                <Text style={[styles.badgeText, { color: pri.color }]}>{pri.label}</Text>
              </View>
              {todo.dueDate && (
                <Text style={[styles.dueDate, { color: isOverdue ? theme.danger : theme.textMuted }]}>
                  {isOverdue ? 'Overdue ' : 'Due '}
                  {format(new Date(todo.dueDate), 'MMM d')}
                </Text>
              )}
              {todo.reminder?.enabled && (
                <AppIcon name="notifications-outline" size={14} color={theme.warning} />
              )}
              {todo.attachments?.length > 0 && (
                <View style={[styles.attachBadge, { backgroundColor: `${theme.primary}25`, borderColor: `${theme.primary}55` }]}>
                  <Ionicons name="attach" size={11} color={theme.primary} />
                  <Text style={[styles.attachBadgeText, { color: theme.primary }]}>
                    {todo.attachments.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Subtasks progress */}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <View style={styles.subtaskRow}>
                <View style={[styles.subtaskBar, { backgroundColor: theme.inputBg }]}>
                  <View
                    style={[
                      styles.subtaskFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${(todo.subtasks.filter(s => s.completed).length / todo.subtasks.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.subtaskText, { color: theme.textMuted }]}>
                  {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => deleteTodo(todo)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </GlassCard>
      </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <LiquidBackground>
      <View style={styles.headerSection}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>My Tasks</Text>
          {stats && (
            <Text style={[styles.statsText, { color: theme.textMuted }]}>
              {stats.pending} pending · {stats.completed} done · {stats.completionRate || 0}% complete
            </Text>
          )}
        </View>
        {stats && stats.total > 0 && (
          <View style={[styles.miniProgress, { backgroundColor: theme.inputBg }]}>
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.miniProgressFill, { width: `${stats.completionRate || 0}%` }]}
            />
          </View>
        )}
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f ? theme.primary : theme.glass,
                borderColor: filter === f ? theme.primary : theme.glassBorder,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : theme.textSecondary }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.filterContent}>
        {CATEGORIES.map((c) => {
          const cat = categoryConfig[c] || { icon: 'apps-outline', label: 'All' };
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.catPill,
                {
                  backgroundColor: category === c ? `${theme.primary}30` : theme.inputBg,
                  borderColor: category === c ? theme.primary : 'transparent',
                },
              ]}
              onPress={() => setCategory(c)}
            >
              <AppIcon name={c === 'all' ? 'apps-outline' : cat.icon} size={15} color={category === c ? theme.primary : theme.textMuted} style={styles.catEmoji} />
              <Text style={[styles.catText, { color: category === c ? theme.primary : theme.textMuted }]}>
                {c === 'all' ? 'All' : cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Todo List — drag-and-drop in the pending-all view */}
      {canReorder && (
        <Text style={[styles.reorderHint, { color: theme.textMuted }]}>
          ↕ Long-press to drag · ← swipe to delete · → swipe to complete
        </Text>
      )}
      <DraggableFlatList
        data={todos}
        renderItem={renderTodo}
        keyExtractor={(item) => item._id}
        onDragEnd={({ data }) => {
          setTodos(data);
          if (canReorder) persistReorder(data);
        }}
        activationDistance={canReorder ? 8 : 9999}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadTodos();
            setRefreshing(false);
          }} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppIcon name="clipboard-outline" size={56} color={theme.textMuted} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Tap + to create your first task.
            </Text>
          </View>
        }
      />

      {/* Floating Actions */}
      <View style={[styles.fabContainer, { bottom: fabBottom }]}>
        <TouchableOpacity
          style={[styles.fab]}
          onPress={() => navigation.navigate('AddTodo')}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <SnoozeSheet
        visible={!!snoozeTarget}
        onClose={() => setSnoozeTarget(null)}
        onSnooze={snoozeTodo}
        taskTitle={snoozeTarget?.title}
      />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '800' },
  statsText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  miniProgress: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  filterScroll: { flexGrow: 0, marginBottom: 10 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingVertical: 4 },
  filterPill: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1,
    minHeight: 38, alignItems: 'center', justifyContent: 'center',
  },
  filterText: { fontSize: 13, fontWeight: '700' },
  catScroll: { flexGrow: 0, marginBottom: 12 },
  catPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1,
    minHeight: 36,
  },
  catEmoji: { fontSize: 14, marginRight: 5 },
  catText: { fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 20 },
  reorderHint: {
    fontSize: 11, fontWeight: '600', textAlign: 'center',
    marginBottom: 8, paddingHorizontal: 20,
  },
  todoCard: { marginBottom: 10 },
  todoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2,
  },
  todoContent: { flex: 1 },
  todoTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  todoEmoji: { fontSize: 18, marginRight: 8 },
  todoTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  todoMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 11, fontWeight: '500' },
  reminderBadge: { fontSize: 14 },
  attachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  attachBadgeText: { fontSize: 10, fontWeight: '800' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  subtaskBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  subtaskFill: { height: '100%', borderRadius: 2 },
  subtaskText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fabContainer: { position: 'absolute', right: 20, alignItems: 'center', gap: 12 },
  fabSecondary: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  fab: { borderRadius: 20, overflow: 'hidden' },
  fabGradient: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
