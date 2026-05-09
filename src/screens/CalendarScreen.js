import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import AppIcon from '../components/AppIcon';
import api from '../api/client';
import { moodConfig, priorityConfig } from '../themes';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay();
  const totalDays = last.getDate();
  const weeks = [];
  let week = new Array(startOffset).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function CalendarScreen({ navigation }) {
  const { theme } = useTheme();
  const today = new Date();

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(today);
  const [todos, setTodos] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(cursor.year, cursor.month, 1).toISOString();
      const end = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59).toISOString();
      const [todosRes, diaryRes] = await Promise.all([
        api.get(`/todos?limit=500&sortBy=dueDate&order=asc`),
        api.get(`/diary?startDate=${start}&endDate=${end}&limit=500`),
      ]);
      setTodos(todosRes.data.todos || []);
      setEntries(diaryRes.data.entries || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => { load(); }, [load]);

  const weeks = useMemo(() => monthMatrix(cursor.year, cursor.month), [cursor]);

  // Maps: date -> items
  const todosByDay = useMemo(() => {
    const m = {};
    for (const t of todos) {
      if (!t.dueDate) continue;
      const k = new Date(t.dueDate).toDateString();
      (m[k] = m[k] || []).push(t);
    }
    return m;
  }, [todos]);

  const entriesByDay = useMemo(() => {
    const m = {};
    for (const e of entries) {
      const k = new Date(e.createdAt).toDateString();
      (m[k] = m[k] || []).push(e);
    }
    return m;
  }, [entries]);

  const shift = (delta) => {
    Haptics.selectionAsync();
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCursor({ year: y, month: m });
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const selectedTodos = todosByDay[selected.toDateString()] || [];
  const selectedEntries = entriesByDay[selected.toDateString()] || [];

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calendar</Text>
        <TouchableOpacity
          onPress={() => { setCursor({ year: today.getFullYear(), month: today.getMonth() }); setSelected(today); }}
          style={styles.todayBtn}
        >
          <Text style={[styles.todayText, { color: theme.primary }]}>Today</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
        style={{ opacity: fade }}
      >
        {/* Month navigator */}
        <GlassCard variant="solid" style={styles.calCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => shift(-1)} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => shift(1)} style={styles.monthBtn}>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[styles.weekday, { color: theme.textMuted }]}>{d}</Text>
            ))}
          </View>

          {/* Weeks grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.dayCell} />;
                const key = day.toDateString();
                const dayTodos = todosByDay[key] || [];
                const dayEntries = entriesByDay[key] || [];
                const isToday = sameDay(day, today);
                const isSelected = sameDay(day, selected);
                const hasTodos = dayTodos.length > 0;
                const hasEntries = dayEntries.length > 0;
                const moodOfDay = dayEntries[0]?.mood;
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: `${theme.primary}22`, borderColor: theme.primary, borderWidth: 1 },
                      isToday && !isSelected && { borderColor: theme.primary, borderWidth: 1 },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setSelected(day); }}
                  >
                    <Text style={[
                      styles.dayNumber,
                      { color: isSelected ? theme.primary : isToday ? theme.primary : theme.text },
                    ]}>
                      {day.getDate()}
                    </Text>
                    <View style={styles.dotRow}>
                      {hasTodos && (
                        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                      )}
                      {hasEntries && (
                        <View style={[
                          styles.dot,
                          { backgroundColor: moodConfig[moodOfDay]?.color || theme.accent },
                        ]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={[styles.legendRow, { borderTopColor: theme.glassBorder }]}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Tasks</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Diary</Text>
            </View>
          </View>
        </GlassCard>

        {/* Selected day detail */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayHeaderTitle, { color: theme.text }]}>
            {selected.toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>
          <Text style={[styles.dayHeaderCount, { color: theme.textMuted }]}>
            {selectedTodos.length} task{selectedTodos.length === 1 ? '' : 's'}
            {selectedEntries.length > 0 ? ` · ${selectedEntries.length} entr${selectedEntries.length === 1 ? 'y' : 'ies'}` : ''}
          </Text>
        </View>

        {selectedTodos.length === 0 && selectedEntries.length === 0 ? (
          <GlassCard variant="light" style={{ padding: 20, alignItems: 'center' }}>
            <AppIcon name="leaf-outline" size={44} color={theme.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nothing scheduled for this day
            </Text>
            <GlassButton
              title="Add Task"
              onPress={() => navigation.navigate('AddTodo')}
              icon="add"
              variant="glass"
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        ) : (
          <>
            {selectedTodos.map(todo => {
              const p = priorityConfig[todo.priority] || priorityConfig.medium;
              return (
                <GlassCard key={todo._id} variant="light" style={styles.item}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: `${p.color}22` }]}>
                      <AppIcon name={todo.emoji} fallback="document-text-outline" size={18} color={p.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text, textDecorationLine: todo.completed ? 'line-through' : 'none' }]} numberOfLines={1}>
                        {todo.title}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                        {todo.category} · {todo.priority}
                      </Text>
                    </View>
                    <View style={[styles.pDot, { backgroundColor: p.color }]} />
                  </View>
                </GlassCard>
              );
            })}
            {selectedEntries.map(entry => {
              const m = moodConfig[entry.mood] || moodConfig.neutral;
              return (
                <GlassCard
                  key={entry._id}
                  variant="light"
                  style={styles.item}
                  onPress={() => navigation.navigate('DiaryDetail', { id: entry._id })}
                >
                  <View style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: `${m.color}22` }]}>
                      <Text style={{ fontSize: 20 }}>{entry.moodEmoji || m.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                        {m.label} · {entry.wordCount || 0} words
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </>
        )}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 58, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  todayText: { fontSize: 14, fontWeight: '700' },
  scroll: { paddingHorizontal: 18, paddingBottom: 40 },
  calCard: { marginBottom: 14, padding: 14 },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 17, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: {
    flex: 1, aspectRatio: 1, margin: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
  },
  dayNumber: { fontSize: 13, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11, fontWeight: '600' },
  dayHeader: { paddingHorizontal: 4, marginBottom: 10 },
  dayHeaderTitle: { fontSize: 17, fontWeight: '800' },
  dayHeaderCount: { fontSize: 12, marginTop: 2 },
  item: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  pDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
