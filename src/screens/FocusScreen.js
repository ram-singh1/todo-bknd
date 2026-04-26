import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Easing, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import api from '../api/client';
import { priorityConfig } from '../themes';

const PRESETS = [
  { key: 'focus25', label: 'Focus', mins: 25, emoji: '🎯', type: 'focus' },
  { key: 'focus50', label: 'Deep', mins: 50, emoji: '🔥', type: 'focus' },
  { key: 'break5', label: 'Break', mins: 5, emoji: '☕', type: 'break' },
  { key: 'break15', label: 'Long Break', mins: 15, emoji: '🌿', type: 'break' },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function FocusScreen({ navigation }) {
  const { theme } = useTheme();

  const [preset, setPreset] = useState(PRESETS[0]);
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].mins * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalFocusSec, setTotalFocusSec] = useState(0);

  const [todos, setTodos] = useState([]);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [loadingTodos, setLoadingTodos] = useState(false);

  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const loadTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const res = await api.get('/todos?completed=false&sortBy=priority&order=asc&limit=25');
      setTodos(res.data.todos || []);
    } catch {} finally {
      setLoadingTodos(false);
    }
  }, []);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  // Pulse the timer when running
  useEffect(() => {
    if (running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [running]);

  // Progress ring animation
  useEffect(() => {
    const total = preset.mins * 60;
    const progress = (total - secondsLeft) / total;
    Animated.timing(ringAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft, preset]);

  // Tick
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleComplete = async () => {
    setRunning(false);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    if (preset.type === 'focus') {
      setCompletedSessions(n => n + 1);
      setTotalFocusSec(s => s + preset.mins * 60);
    }
    Alert.alert(
      preset.type === 'focus' ? 'Session complete 🎉' : 'Break over ☕',
      preset.type === 'focus'
        ? `You focused for ${preset.mins} minutes. Take a well-earned break.`
        : 'Time to get back to it.',
      [{ text: 'OK' }],
    );
  };

  const pickPreset = (p) => {
    if (running) return;
    Haptics.selectionAsync();
    setPreset(p);
    setSecondsLeft(p.mins * 60);
  };

  const startPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(r => !r);
  };

  const reset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    setSecondsLeft(preset.mins * 60);
  };

  const completeTodo = async () => {
    if (!selectedTodo) return;
    try {
      await api.put(`/todos/${selectedTodo._id}`, { completed: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedTodo(null);
      loadTodos();
    } catch {}
  };

  const total = preset.mins * 60;
  const progress = 1 - secondsLeft / total;

  return (
    <LiquidBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Focus Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Preset chips */}
        <View style={styles.presetRow}>
          {PRESETS.map(p => {
            const active = preset.key === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => pickPreset(p)}
                disabled={running}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? `${theme.primary}30` : theme.inputBg,
                    borderColor: active ? theme.primary : 'transparent',
                    opacity: running && !active ? 0.35 : 1,
                  },
                ]}
              >
                <Text style={styles.presetEmoji}>{p.emoji}</Text>
                <Text style={[styles.presetLabel, { color: active ? theme.primary : theme.textSecondary }]}>
                  {p.label}
                </Text>
                <Text style={[styles.presetMins, { color: active ? theme.primary : theme.textMuted }]}>
                  {p.mins}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timer ring */}
        <View style={styles.timerWrap}>
          <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]}>
            <LinearGradient
              colors={[theme.primary, theme.secondary, theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.ringMask, { backgroundColor: theme.background }]}>
              {/* Inner gradient overlay for depth */}
              <LinearGradient
                colors={[`${theme.primary}22`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.timerText, { color: theme.text }]}>
                {formatTime(secondsLeft)}
              </Text>
              <Text style={[styles.timerLabel, { color: theme.textMuted }]}>
                {preset.emoji} {preset.label} · {Math.round(progress * 100)}%
              </Text>
            </View>

            {/* Shaded overlay for "unfilled" portion of the ring */}
            <View
              pointerEvents="none"
              style={[
                styles.unfilled,
                {
                  opacity: 1 - progress,
                  backgroundColor: `${theme.background}E5`,
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Controls */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            onPress={reset}
          >
            <Ionicons name="refresh" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={startPause} style={styles.mainBtn}>
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.mainBtnInner}
            >
              <Ionicons name={running ? 'pause' : 'play'} size={36} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            onPress={() => { setRunning(false); setSecondsLeft(0); handleComplete(); }}
          >
            <Ionicons name="checkmark" size={22} color={theme.success} />
          </TouchableOpacity>
        </View>

        {/* Session stats */}
        <View style={styles.statsRow}>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>🍅</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{completedSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Sessions</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {Math.round(totalFocusSec / 60)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Min focused</Text>
          </GlassCard>
          <GlassCard variant="light" style={styles.statTile}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {selectedTodo ? '1' : '0'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>On task</Text>
          </GlassCard>
        </View>

        {/* Linked task */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          LINKED TASK
        </Text>

        {selectedTodo ? (
          <GlassCard variant="accent" glow style={{ marginBottom: 14 }}>
            <View style={styles.linkedRow}>
              <Text style={{ fontSize: 24 }}>{selectedTodo.emoji || '📝'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkedTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedTodo.title}
                </Text>
                <Text style={[styles.linkedMeta, { color: theme.textMuted }]}>
                  {selectedTodo.category} · {selectedTodo.priority}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTodo(null)}>
                <Ionicons name="close-circle" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <GlassButton
              title="Mark complete"
              onPress={completeTodo}
              icon="checkmark-done"
              variant="glass"
              fullWidth
              size="small"
              style={{ marginTop: 10 }}
            />
          </GlassCard>
        ) : (
          <GlassCard variant="light" style={{ marginBottom: 14 }}>
            <Text style={[styles.pickHint, { color: theme.textSecondary }]}>
              Pick a task to focus on for better tracking.
            </Text>
          </GlassCard>
        )}

        {/* Pending todos to pick */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          PICK A TASK
        </Text>
        {todos.length === 0 ? (
          <GlassCard variant="light" style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🏁</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No pending tasks. Enjoy the focus time!
            </Text>
          </GlassCard>
        ) : (
          todos.map(todo => {
            const p = priorityConfig[todo.priority] || priorityConfig.medium;
            const active = selectedTodo?._id === todo._id;
            return (
              <GlassCard
                key={todo._id}
                variant={active ? 'accent' : 'light'}
                style={styles.todoCard}
                onPress={() => { Haptics.selectionAsync(); setSelectedTodo(todo); }}
              >
                <View style={styles.todoRow}>
                  <View style={[styles.todoDot, { backgroundColor: p.color }]} />
                  <Text style={styles.todoEmoji}>{todo.emoji || '📝'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.todoTitle, { color: theme.text }]} numberOfLines={1}>
                      {todo.title}
                    </Text>
                    <Text style={[styles.todoMeta, { color: theme.textMuted }]}>
                      {todo.category} · {p.label}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                </View>
              </GlassCard>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 30 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  presetEmoji: { fontSize: 20 },
  presetLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  presetMins: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  timerWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  ring: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringMask: {
    position: 'absolute',
    top: 8, left: 8, right: 8, bottom: 8,
    borderRadius: 122,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unfilled: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    borderRadius: 130,
  },
  timerText: { fontSize: 56, fontWeight: '800', letterSpacing: 1 },
  timerLabel: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  controlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
    marginTop: 18, marginBottom: 20,
  },
  controlBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  mainBtn: {
    width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  mainBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkedTitle: { fontSize: 15, fontWeight: '700' },
  linkedMeta: { fontSize: 12, marginTop: 2 },
  pickHint: { fontSize: 13, textAlign: 'center' },
  todoCard: { marginBottom: 8 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todoDot: { width: 4, height: 28, borderRadius: 2 },
  todoEmoji: { fontSize: 20 },
  todoTitle: { fontSize: 14, fontWeight: '700' },
  todoMeta: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});
