import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { DonutChart } from '../components/AdvancedCharts';
import api from '../api/client';

let nextId = 1;
const uid = () => `id-${nextId++}-${Math.random().toString(36).slice(2, 6)}`;

export default function DecisionMatrixScreen({ navigation }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState([
    { id: uid(), name: 'Cost', weight: 3 },
    { id: uid(), name: 'Time', weight: 2 },
    { id: uid(), name: 'Impact', weight: 5 },
  ]);
  const [options, setOptions] = useState([
    { id: uid(), name: 'Option A' },
    { id: uid(), name: 'Option B' },
  ]);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  const setScore = (oid, cid, value) => {
    const v = Math.max(0, Math.min(10, parseFloat(value) || 0));
    setScores((s) => ({ ...s, [oid]: { ...(s[oid] || {}), [cid]: v } }));
  };

  const totals = useMemo(() => {
    return options.map((o) => {
      let total = 0;
      let max = 0;
      criteria.forEach((c) => {
        const v = scores[o.id]?.[c.id] || 0;
        total += v * c.weight;
        max += 10 * c.weight;
      });
      return { ...o, total, max, pct: max > 0 ? Math.round((total / max) * 100) : 0 };
    }).sort((a, b) => b.total - a.total);
  }, [options, criteria, scores]);

  const winner = totals[0];

  const colors = ['#6C63FF', '#10B981', '#F97316', '#EC4899', '#0EA5E9', '#A78BFA', '#F59E0B'];

  const save = async () => {
    if (!title) { Alert.alert('Title required'); return; }
    setSaving(true);
    try {
      await api.post('/tools', {
        kind: 'decision', title,
        payload: { criteria, options, scores, winner: winner?.name },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  const addOption = () => setOptions([...options, { id: uid(), name: `Option ${String.fromCharCode(65 + options.length)}` }]);
  const removeOption = (id) => {
    setOptions(options.filter((o) => o.id !== id));
    setScores((s) => { const n = { ...s }; delete n[id]; return n; });
  };
  const addCriterion = () => setCriteria([...criteria, { id: uid(), name: 'New criterion', weight: 3 }]);
  const removeCriterion = (id) => {
    setCriteria(criteria.filter((c) => c.id !== id));
    setScores((s) => {
      const n = { ...s };
      Object.keys(n).forEach((oid) => { delete n[oid][id]; });
      return n;
    });
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>🧮 Decision Matrix</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassInput
            label="What are you deciding?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Which job offer to accept"
            icon="bulb-outline"
          />

          {/* Winner */}
          {winner && winner.total > 0 && (
            <GlassCard variant="solid" glow style={styles.winnerCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <DonutChart
                  size={120}
                  innerRadius={42}
                  data={totals.map((t, i) => ({
                    value: Math.max(0.001, t.total),
                    color: colors[i % colors.length],
                  }))}
                  centerValue={winner.pct + '%'}
                  centerLabel="WINNER"
                  hideText
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.winnerLabel, { color: theme.textMuted }]}>RECOMMENDED</Text>
                  <Text style={[styles.winnerName, { color: theme.text }]} numberOfLines={2}>
                    {winner.name}
                  </Text>
                  <Text style={[styles.winnerScore, { color: theme.primary }]}>
                    {winner.total} / {winner.max} pts
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 14, gap: 6 }}>
                {totals.map((t, i) => (
                  <View key={t.id} style={styles.rankRow}>
                    <View style={[styles.rankDot, { backgroundColor: colors[i % colors.length] }]} />
                    <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>{t.name}</Text>
                    <Text style={[styles.rankPts, { color: theme.textSecondary }]}>{t.total} pts</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Criteria */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CRITERIA</Text>
            <TouchableOpacity onPress={addCriterion}>
              <Text style={[styles.addBtn, { color: theme.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {criteria.map((c) => (
            <GlassCard key={c.id} variant="light" style={styles.row}>
              <TextInput
                value={c.name}
                onChangeText={(v) => setCriteria(criteria.map((x) => x.id === c.id ? { ...x, name: v } : x))}
                style={[styles.input, { color: theme.text, flex: 1 }]}
                placeholderTextColor={theme.textMuted}
              />
              <View style={[styles.weightRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
                <Text style={[styles.weightLabel, { color: theme.textMuted }]}>weight</Text>
                {[1, 2, 3, 4, 5].map((w) => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => setCriteria(criteria.map((x) => x.id === c.id ? { ...x, weight: w } : x))}
                    style={[styles.weightBtn, c.weight === w && { backgroundColor: theme.primary }]}
                  >
                    <Text style={{ color: c.weight === w ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => removeCriterion(c.id)}>
                <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          ))}

          {/* Options + scoring grid */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>OPTIONS &amp; SCORES (0–10)</Text>
            <TouchableOpacity onPress={addOption}>
              <Text style={[styles.addBtn, { color: theme.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {options.map((o) => (
            <GlassCard key={o.id} variant="solid" style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={o.name}
                  onChangeText={(v) => setOptions(options.map((x) => x.id === o.id ? { ...x, name: v } : x))}
                  style={[styles.input, { color: theme.text, flex: 1 }]}
                />
                <TouchableOpacity onPress={() => removeOption(o.id)}>
                  <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 10, gap: 8 }}>
                {criteria.map((c) => (
                  <View key={c.id} style={styles.scoreRow}>
                    <Text style={[styles.scoreLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                      {c.name} <Text style={{ color: theme.textMuted, fontSize: 10 }}>×{c.weight}</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {[0, 2, 4, 6, 8, 10].map((v) => {
                        const cur = scores[o.id]?.[c.id] || 0;
                        const on = cur === v;
                        return (
                          <TouchableOpacity
                            key={v}
                            onPress={() => setScore(o.id, c.id, v)}
                            style={[
                              styles.scoreBtn,
                              { backgroundColor: on ? theme.primary : theme.inputBg, borderColor: theme.glassBorder },
                            ]}
                          >
                            <Text style={{ color: on ? '#fff' : theme.textSecondary, fontWeight: '700', fontSize: 11 }}>{v}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))}

          <GlassButton title="Save matrix" icon="checkmark" onPress={save} loading={saving} fullWidth style={{ marginTop: 8 }} />
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidBackground>
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

  winnerCard: { marginBottom: 14 },
  winnerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  winnerName: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  winnerScore: { fontSize: 13, fontWeight: '800', marginTop: 4 },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankDot: { width: 8, height: 8, borderRadius: 4 },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600' },
  rankPts: { fontSize: 12, fontWeight: '700' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  addBtn: { fontSize: 13, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  input: { fontSize: 14, fontWeight: '700', paddingVertical: 6 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  weightLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  weightBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  scoreLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  scoreBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
