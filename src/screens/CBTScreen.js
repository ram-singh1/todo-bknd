import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { AreaChart } from '../components/AdvancedCharts';
import api from '../api/client';

const DISTORTIONS = [
  'All-or-nothing thinking', 'Catastrophizing', 'Mind reading',
  'Fortune telling', 'Personalization', 'Should statements',
  'Emotional reasoning', 'Filtering', 'Discounting positives',
  'Labeling', 'Magnification', 'Overgeneralizing',
];

const STEPS = [
  { id: 'situation',         label: 'Situation', placeholder: 'What happened? Stick to facts.' },
  { id: 'automaticThought',  label: 'Automatic thought', placeholder: 'What went through your mind?' },
  { id: 'evidenceFor',       label: 'Evidence FOR the thought', placeholder: 'What supports it?' },
  { id: 'evidenceAgainst',   label: 'Evidence AGAINST the thought', placeholder: 'What contradicts it?' },
  { id: 'balancedThought',   label: 'Balanced thought', placeholder: 'A more accurate take.' },
];

export default function CBTScreen({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/tools?kind=cbt');
      setItems(res.data.tools || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mood improvement chart
  const moodSeries = items
    .filter((t) => t.payload?.moodBefore != null && t.payload?.moodAfter != null)
    .slice(-14)
    .reverse()
    .map((t) => t.payload.moodAfter - t.payload.moodBefore);

  const avgImprovement = moodSeries.length
    ? Math.round((moodSeries.reduce((s, v) => s + v, 0) / moodSeries.length) * 10) / 10
    : 0;

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>🧠 CBT Records</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {moodSeries.length >= 3 && (
          <GlassCard variant="solid" glow style={{ marginBottom: 14 }}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>AVERAGE MOOD LIFT</Text>
            <Text style={[styles.kpiValue, { color: avgImprovement > 0 ? theme.success : theme.danger }]}>
              {avgImprovement > 0 ? '+' : ''}{avgImprovement}<Text style={{ fontSize: 16, color: theme.textMuted }}> /10</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>
              From {moodSeries.length} recent records
            </Text>
            <View style={{ marginTop: 10 }}>
              <AreaChart values={moodSeries.map((v) => v + 5)} primaryColor={theme.success} height={90} showYLabels={false} />
            </View>
          </GlassCard>
        )}

        {items.length === 0 && (
          <GlassCard variant="accent" glow>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Reframe a thought</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              When something throws you off — a mistake, a worry, a tough conversation — walk through 5 quick steps to get a more balanced view.
            </Text>
            <GlassButton title="New record" icon="add" onPress={() => setShowNew(true)} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {items.map((t) => (
          <GlassCard key={t._id} variant="solid" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.title}</Text>
            <Text style={[styles.cardSnippet, { color: theme.textSecondary }]} numberOfLines={2}>
              {t.payload?.balancedThought || t.payload?.automaticThought}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {new Date(t.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </Text>
              {t.payload?.moodBefore != null && t.payload?.moodAfter != null && (
                <View style={[styles.moodPill, {
                  backgroundColor: t.payload.moodAfter > t.payload.moodBefore ? `${theme.success}25` : `${theme.danger}25`,
                }]}>
                  <Text style={{ color: t.payload.moodAfter > t.payload.moodBefore ? theme.success : theme.danger, fontSize: 11, fontWeight: '800' }}>
                    Mood {t.payload.moodBefore} → {t.payload.moodAfter}
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <NewModal visible={showNew} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />
    </LiquidBackground>
  );
}

function NewModal({ visible, onClose, onSaved }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [moodBefore, setMoodBefore] = useState(5);
  const [moodAfter, setMoodAfter] = useState(5);
  const [distortions, setDistortions] = useState([]);
  const [saving, setSaving] = useState(false);

  const cur = STEPS[step];

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const submit = async () => {
    if (!title) { Alert.alert('Add a title'); return; }
    setSaving(true);
    try {
      await api.post('/tools', {
        kind: 'cbt', title,
        payload: { ...data, distortions, moodBefore, moodAfter },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle(''); setStep(0); setData({}); setMoodBefore(5); setMoodAfter(5); setDistortions([]);
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  const toggleDistortion = (d) => {
    setDistortions((arr) => arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ScrollView style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={[styles.sheetTitle, { color: theme.text, marginBottom: 0 }]}>CBT record</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700' }}>
                Step {step + 1} of {STEPS.length}
              </Text>
            </View>

            {/* Progress dots */}
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
              {STEPS.map((_, i) => (
                <View key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  backgroundColor: i <= step ? theme.primary : theme.inputBg,
                }} />
              ))}
            </View>

            <GlassInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Felt awful after meeting" icon="bookmark-outline" />

            <GlassInput
              label={cur.label}
              value={data[cur.id] || ''}
              onChangeText={(v) => setData((d) => ({ ...d, [cur.id]: v }))}
              placeholder={cur.placeholder}
              icon="reader-outline"
              multiline
              numberOfLines={5}
            />

            {step === 1 && (
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>COMMON DISTORTIONS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {DISTORTIONS.map((d) => {
                    const on = distortions.includes(d);
                    return (
                      <TouchableOpacity key={d} onPress={() => toggleDistortion(d)}
                        style={[
                          styles.dchip,
                          {
                            backgroundColor: on ? `${theme.primary}30` : theme.inputBg,
                            borderColor: on ? theme.primary : theme.glassBorder,
                          },
                        ]}>
                        <Text style={{ color: on ? theme.text : theme.textSecondary, fontSize: 11, fontWeight: '700' }}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {step === STEPS.length - 1 && (
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>MOOD BEFORE</Text>
                <MoodSlider value={moodBefore} onChange={setMoodBefore} />
                <Text style={[styles.label, { color: theme.textMuted, marginTop: 14 }]}>MOOD AFTER</Text>
                <MoodSlider value={moodAfter} onChange={setMoodAfter} />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {step > 0 && <GlassButton title="Back" variant="ghost" onPress={prev} style={{ flex: 1 }} />}
              {step < STEPS.length - 1 ? (
                <GlassButton title="Next" icon="arrow-forward" onPress={next} style={{ flex: 1 }} />
              ) : (
                <GlassButton title="Save" icon="checkmark" onPress={submit} loading={saving} style={{ flex: 1 }} />
              )}
              <GlassButton title="" icon="close" variant="ghost" onPress={onClose} />
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function MoodSlider({ value, onChange }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.moodRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
        const on = value === n;
        const color = n <= 3 ? '#EF4444' : n <= 6 ? '#F59E0B' : '#10B981';
        return (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={[styles.moodDot, on && { backgroundColor: color }]}>
            <Text style={{ color: on ? '#fff' : theme.textSecondary, fontWeight: '800', fontSize: 12 }}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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

  kpiLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  kpiValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  kpiSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },

  card: { marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSnippet: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'space-between' },
  metaText: { fontSize: 11, fontWeight: '700' },
  moodPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  sheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, maxHeight: '94%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },

  dchip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  moodRow: {
    flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, gap: 2,
  },
  moodDot: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10,
  },
});
