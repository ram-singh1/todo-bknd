import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { GoalRing, AreaChart, SparkLine } from '../components/AdvancedCharts';
import api from '../api/client';

const TYPES = [
  { id: 'water',     label: 'Water',    emoji: '💧', unit: 'glasses', color: '#0EA5E9', target: 8 },
  { id: 'sleep',     label: 'Sleep',    emoji: '😴', unit: 'hours',   color: '#A78BFA', target: 8 },
  { id: 'weight',    label: 'Weight',   emoji: '⚖️', unit: 'kg',      color: '#10B981', target: 0 },
  { id: 'workout',   label: 'Workout',  emoji: '💪', unit: 'minutes', color: '#F97316', target: 30 },
  { id: 'steps',     label: 'Steps',    emoji: '🚶', unit: 'steps',   color: '#22C55E', target: 10000 },
  { id: 'meals',     label: 'Meals',    emoji: '🍽️', unit: 'meals',   color: '#F59E0B', target: 3 },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function HealthScreen({ navigation }) {
  const { theme } = useTheme();
  const [summary, setSummary] = useState({});
  const [activeType, setActiveType] = useState('water');
  const [details, setDetails] = useState({ logs: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/health-log/summary');
      const idx = {};
      (res.data.summary?.byType || []).forEach((t) => { idx[t.type] = t; });
      setSummary(idx);
    } finally { setLoading(false); }
  }, []);

  const loadDetails = useCallback(async (type) => {
    try {
      const res = await api.get(`/health-log?type=${type}&days=30`);
      setDetails({ logs: res.data.logs || [], series: res.data.series || [] });
    } catch {}
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadDetails(activeType); }, [activeType, loadDetails]);

  const cfg = TYPE_BY_ID[activeType];
  const todayValue = summary[activeType]?.today || 0;
  const seriesValues = details.series.map((s) => s.value);
  const avg7d = (() => {
    const last7 = seriesValues.slice(-7);
    if (!last7.length) return 0;
    return Math.round((last7.reduce((s, v) => s + v, 0) / last7.length) * 10) / 10;
  })();
  const best = Math.max(0, ...seriesValues);

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Health</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 14 }}>
          {TYPES.map((t) => {
            const on = activeType === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => setActiveType(t.id)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: on ? `${t.color}30` : theme.inputBg,
                    borderColor: on ? t.color : theme.glassBorder,
                  },
                ]}>
                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                <Text style={[styles.typeText, { color: on ? theme.text : theme.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Today big card */}
        <GlassCard variant="solid" glow style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {cfg.target > 0 ? (
              <GoalRing
                size={130}
                color={cfg.color}
                value={todayValue}
                target={cfg.target}
                label={cfg.unit.toUpperCase()}
              />
            ) : (
              <View style={{ width: 130, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 38 }}>{cfg.emoji}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigLabel, { color: theme.textMuted }]}>TODAY</Text>
              <Text style={[styles.bigValue, { color: theme.text }]}>
                {todayValue}<Text style={{ fontSize: 14, color: theme.textMuted }}> {cfg.unit}</Text>
              </Text>
              <View style={styles.miniRow}>
                <View style={styles.miniBox}>
                  <Text style={[styles.miniValue, { color: theme.text }]}>{avg7d}</Text>
                  <Text style={[styles.miniLabel, { color: theme.textMuted }]}>7d avg</Text>
                </View>
                <View style={styles.miniBox}>
                  <Text style={[styles.miniValue, { color: theme.text }]}>{best || 0}</Text>
                  <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Best</Text>
                </View>
              </View>
              <GlassButton
                title="Log now"
                icon="add"
                onPress={() => setShowAdd(true)}
                size="small"
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        </GlassCard>

        {/* 30-day trend */}
        <GlassCard variant="solid" style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Last 30 days</Text>
          <Text style={[styles.sectionSub, { color: theme.textMuted }]}>{cfg.label} trend</Text>
          <AreaChart
            values={seriesValues}
            primaryColor={cfg.color}
            height={170}
          />
        </GlassCard>

        {/* All-types overview */}
        <Text style={[styles.subhead, { color: theme.textMuted }]}>OVERVIEW</Text>
        <View style={styles.overviewGrid}>
          {TYPES.map((t) => {
            const today = summary[t.id]?.today || 0;
            const days = summary[t.id]?.days || {};
            const last7 = [];
            for (let i = 6; i >= 0; i--) {
              const dt = new Date();
              dt.setDate(dt.getDate() - i);
              const k = dt.toISOString().slice(0, 10);
              last7.push(days[k] || 0);
            }
            const pct = t.target > 0 ? Math.min(100, Math.round((today / t.target) * 100)) : null;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveType(t.id)}
                activeOpacity={0.85}
                style={{ width: '48%' }}
              >
                <GlassCard variant="light" style={styles.overviewCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                    <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>{t.label}</Text>
                  </View>
                  <Text style={[styles.overviewValue, { color: theme.text }]}>
                    {today}<Text style={{ fontSize: 11, color: theme.textMuted }}> {t.unit}</Text>
                  </Text>
                  {pct != null && (
                    <View style={[styles.miniBar, { backgroundColor: theme.inputBg }]}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: t.color }} />
                    </View>
                  )}
                  <SparkLine values={last7} color={t.color} height={28} width={120} />
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LogModal
        visible={showAdd}
        type={cfg}
        onClose={() => setShowAdd(false)}
        onSaved={() => { setShowAdd(false); loadSummary(); loadDetails(activeType); }}
      />
    </LiquidBackground>
  );
}

function LogModal({ visible, type, onClose, onSaved }) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const v = parseFloat(value);
    if (!v && v !== 0) { Alert.alert('Enter a value'); return; }
    setSaving(true);
    try {
      await api.post('/health-log', {
        type: type.id,
        value: v,
        unit: type.unit,
        dateKey: todayKey(),
        note,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setValue(''); setNote('');
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalBg, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {type.emoji} Log {type.label}
            </Text>
            {/* Quick increments for water */}
            {type.id === 'water' && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[1, 2, 4, 8].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setValue(String(n))}
                    style={[styles.quickBtn, { borderColor: theme.glassBorder, backgroundColor: theme.inputBg }]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700' }}>+{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <GlassInput
              label={type.unit.toUpperCase()}
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              icon="analytics-outline"
            />
            <GlassInput label="Note (optional)" value={note} onChangeText={setNote} placeholder="anything to remember" icon="create-outline" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Save" onPress={submit} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 50, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingBottom: 16 },

  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
  },
  typeText: { fontSize: 13, fontWeight: '700' },

  bigLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  bigValue: { fontSize: 32, fontWeight: '800', marginBottom: 8 },

  miniRow: { flexDirection: 'row', gap: 10 },
  miniBox: { flex: 1 },
  miniValue: { fontSize: 16, fontWeight: '800' },
  miniLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 12, marginTop: 2, marginBottom: 10, fontWeight: '500' },

  subhead: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overviewCard: { padding: 12, gap: 6 },
  overviewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  overviewValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  miniBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  quickBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1,
  },
});
