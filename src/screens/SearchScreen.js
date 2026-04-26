import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import api from '../api/client';
import { moodConfig, categoryConfig, priorityConfig } from '../themes';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'todos', label: 'Tasks', emoji: '📋' },
  { key: 'diary', label: 'Diary', emoji: '📖' },
];

const RECENT_KEY = 'recent_searches';

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [todos, setTodos] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    loadRecent();
    return () => clearTimeout(t);
  }, []);

  const loadRecent = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  };

  const saveRecent = async (q) => {
    if (!q.trim()) return;
    try {
      const next = [q, ...recent.filter(r => r !== q)].slice(0, 8);
      setRecent(next);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  };

  const clearRecent = async () => {
    setRecent([]);
    try { await AsyncStorage.removeItem(RECENT_KEY); } catch {}
  };

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setTodos([]); setEntries([]); return;
    }
    setLoading(true);
    try {
      const [todosRes, diaryRes] = await Promise.all([
        filter === 'diary'
          ? Promise.resolve({ data: { todos: [] } })
          : api.get(`/todos?search=${encodeURIComponent(q)}&limit=30`),
        filter === 'todos'
          ? Promise.resolve({ data: { entries: [] } })
          : api.get(`/diary?search=${encodeURIComponent(q)}&limit=30`),
      ]);
      setTodos(todosRes.data.todos || []);
      setEntries(diaryRes.data.entries || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [filter]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const onSubmit = () => {
    if (query.trim()) {
      saveRecent(query.trim());
      Haptics.selectionAsync();
    }
  };

  const totalResults = todos.length + entries.length;
  const hasQuery = query.trim().length > 0;

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <BlurView
          tint={theme.mode === 'light' ? 'light' : 'dark'}
          intensity={48}
          style={[
            styles.searchBar,
            {
              borderColor: theme.mode === 'light' ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.3)',
              backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          <View style={[styles.searchIconBox, { backgroundColor: `${theme.primary}D9` }]}>
            <Ionicons name="search" size={19} color="#FFFFFF" />
          </View>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks, diary entries, tags..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
            selectionColor={theme.primary}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={[
                styles.clearButton,
                { backgroundColor: theme.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.16)' },
              ]}
            >
              <Ionicons name="close" size={18} color={theme.mode === 'light' ? theme.textSecondary : '#FFFFFF'} />
            </TouchableOpacity>
          )}
        </BlurView>

        {/* Filter chips */}
        <BlurView
          tint={theme.mode === 'light' ? 'light' : 'dark'}
          intensity={34}
          style={[
            styles.filterRow,
            {
              borderColor: theme.mode === 'light' ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.24)',
              backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? (theme.mode === 'light' ? `${theme.primary}18` : 'rgba(255,255,255,0.28)')
                      : (theme.mode === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.08)'),
                    borderColor: active
                      ? (theme.mode === 'light' ? `${theme.primary}55` : 'rgba(255,255,255,0.52)')
                      : (theme.mode === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.08)'),
                  },
                ]}
              >
                <Text style={styles.filterEmoji}>{f.emoji}</Text>
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? (theme.mode === 'light' ? theme.primary : '#FFFFFF') : (theme.mode === 'light' ? theme.textSecondary : 'rgba(255,255,255,0.76)') },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ opacity: fade }}
      >
        {/* Result count / loading */}
        {hasQuery && (
          <View style={styles.countRow}>
            {loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Text style={[styles.countText, { color: theme.textMuted }]}>
                {totalResults} result{totalResults === 1 ? '' : 's'} for "{query}"
              </Text>
            )}
          </View>
        )}

        {/* Empty state: recent searches */}
        {!hasQuery && (
          <>
            {recent.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>RECENT</Text>
                  <TouchableOpacity onPress={clearRecent}>
                    <Text style={[styles.clearText, { color: theme.primary }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                  {recent.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.recentPill, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
                      onPress={() => setQuery(r)}
                    >
                      <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                      <Text style={[styles.recentText, { color: theme.textSecondary }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>SHORTCUTS</Text>
            <GlassCard variant="light" style={styles.shortcut} onPress={() => setQuery('urgent')}>
              <Text style={styles.shortcutEmoji}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shortcutTitle, { color: theme.text }]}>Urgent tasks</Text>
                <Text style={[styles.shortcutDesc, { color: theme.textMuted }]}>
                  All your high-priority work
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </GlassCard>
            <GlassCard variant="light" style={styles.shortcut} onPress={() => setQuery('happy')}>
              <Text style={styles.shortcutEmoji}>😊</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shortcutTitle, { color: theme.text }]}>Happy entries</Text>
                <Text style={[styles.shortcutDesc, { color: theme.textMuted }]}>
                  Revisit your best moments
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </GlassCard>
            <GlassCard variant="light" style={styles.shortcut} onPress={() => setQuery('work')}>
              <Text style={styles.shortcutEmoji}>💼</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shortcutTitle, { color: theme.text }]}>Work</Text>
                <Text style={[styles.shortcutDesc, { color: theme.textMuted }]}>
                  Work items across tasks & diary
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </GlassCard>
          </>
        )}

        {/* Empty results */}
        {hasQuery && !loading && totalResults === 0 && (
          <GlassCard variant="light" style={{ alignItems: 'center', padding: 30, marginTop: 20 }}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>No matches</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Try different keywords or tags
            </Text>
          </GlassCard>
        )}

        {/* Todos results */}
        {todos.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              📋 TASKS · {todos.length}
            </Text>
            {todos.map(t => {
              const c = categoryConfig[t.category] || categoryConfig.general;
              const p = priorityConfig[t.priority] || priorityConfig.medium;
              return (
                <GlassCard
                  key={t._id}
                  variant="light"
                  style={styles.result}
                  onPress={() => navigation.navigate('Tasks')}
                >
                  <View style={styles.resultRow}>
                    <View style={[styles.resIcon, { backgroundColor: `${c.color}22` }]}>
                      <Text style={{ fontSize: 18 }}>{t.emoji || c.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.resTitle,
                          {
                            color: theme.text,
                            textDecorationLine: t.completed ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {highlight(t.title, query)}
                      </Text>
                      <Text style={[styles.resMeta, { color: theme.textMuted }]} numberOfLines={1}>
                        {c.label} · {p.label}
                        {t.dueDate ? ` · due ${format(new Date(t.dueDate), 'MMM d')}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.pDot, { backgroundColor: p.color }]} />
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* Diary results */}
        {entries.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              📖 DIARY · {entries.length}
            </Text>
            {entries.map(e => {
              const m = moodConfig[e.mood] || moodConfig.neutral;
              return (
                <GlassCard
                  key={e._id}
                  variant="light"
                  style={styles.result}
                  onPress={() => navigation.navigate('DiaryDetail', { id: e._id })}
                >
                  <View style={styles.resultRow}>
                    <View style={[styles.resIcon, { backgroundColor: `${m.color}22` }]}>
                      <Text style={{ fontSize: 18 }}>{e.moodEmoji || m.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resTitle, { color: theme.text }]} numberOfLines={1}>
                        {highlight(e.title, query)}
                      </Text>
                      <Text style={[styles.resMeta, { color: theme.textMuted }]} numberOfLines={1}>
                        {m.label} · {format(new Date(e.createdAt), 'MMM d, yyyy')}
                        {e.wordCount ? ` · ${e.wordCount} words` : ''}
                      </Text>
                    </View>
                    {e.isFavorite && <Ionicons name="heart" size={16} color={theme.danger} />}
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        <View style={{ height: 80 }} />
      </Animated.ScrollView>
    </LiquidBackground>
  );
}

function highlight(text, q) {
  // Non-DOM-friendly but works: since we only render one <Text>, skip inline highlight.
  // Keeping the function as a hook point in case we render spans later.
  return text;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 58, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBarWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    borderRadius: 28, borderWidth: 1,
    overflow: 'hidden',
  },
  searchIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 0 : 8, fontWeight: '700' },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 7,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1,
  },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  countRow: { alignItems: 'center', marginVertical: 10 },
  countText: { fontSize: 12, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  clearText: { fontSize: 12, fontWeight: '700' },
  recentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  recentText: { fontSize: 12, fontWeight: '600' },
  shortcut: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  shortcutEmoji: { fontSize: 26 },
  shortcutTitle: { fontSize: 14, fontWeight: '700' },
  shortcutDesc: { fontSize: 12, marginTop: 2 },
  result: { marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  resTitle: { fontSize: 14, fontWeight: '700' },
  resMeta: { fontSize: 12, marginTop: 2 },
  pDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13, marginTop: 4 },
});
