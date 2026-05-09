import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { DonutChart } from '../components/AdvancedCharts';
import api from '../api/client';

export default function WorryLogScreen({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [tab, setTab] = useState('open');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/tools?kind=worry');
      setItems(res.data.tools || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = items.filter((t) => t.payload?.didItHappen === undefined);
  const reviewed = items.filter((t) => t.payload?.didItHappen !== undefined);

  // Stats donut
  const yes = reviewed.filter((t) => t.payload?.didItHappen === true).length;
  const no = reviewed.filter((t) => t.payload?.didItHappen === false).length;
  const partial = reviewed.filter((t) => t.payload?.didItHappen === 'partial').length;

  const due = open.filter((t) => t.reviewAt && new Date(t.reviewAt) <= new Date());
  const list = tab === 'open' ? open : reviewed;

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>🫧 Worry Log</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Insight donut */}
        {reviewed.length > 0 && (
          <GlassCard variant="solid" glow style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <DonutChart
                size={130}
                innerRadius={46}
                data={[
                  { value: Math.max(0.001, no), color: theme.success },
                  { value: Math.max(0.001, partial), color: theme.warning },
                  { value: Math.max(0.001, yes), color: theme.danger },
                ]}
                centerValue={`${reviewed.length > 0 ? Math.round((no / reviewed.length) * 100) : 0}%`}
                centerLabel="DIDN'T HAPPEN"
                hideText
              />
              <View style={{ flex: 1, gap: 8 }}>
                <Stat color={theme.success} label="Didn't happen" value={no} />
                <Stat color={theme.warning} label="Partially" value={partial} />
                <Stat color={theme.danger} label="It happened" value={yes} />
              </View>
            </View>
            <Text style={[styles.insightText, { color: theme.textSecondary }]}>
              Most worries don't come to pass. Tracking them proves it.
            </Text>
          </GlassCard>
        )}

        {due.length > 0 && (
          <View style={[styles.dueBanner, { backgroundColor: `${theme.warning}20`, borderColor: `${theme.warning}66` }]}>
            <Ionicons name="time-outline" size={18} color={theme.warning} />
            <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>
              {due.length} ready to review
            </Text>
          </View>
        )}

        <View style={[styles.tabs, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
          {[{ id: 'open', label: `Open · ${open.length}` }, { id: 'reviewed', label: `Reviewed · ${reviewed.length}` }].map((t) => {
            const on = tab === t.id;
            return (
              <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, on && { backgroundColor: theme.primary }]}>
                <Text style={[styles.tabText, { color: on ? '#fff' : theme.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {list.length === 0 && (
          <GlassCard variant="accent" glow style={{ marginTop: 8 }}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {tab === 'open' ? 'Park a worry' : 'No reviews yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {tab === 'open'
                ? 'Write down whatever\'s on your mind. Set a review date — usually 30 days out — and let it go for now.'
                : 'Once you review some open worries, the donut above will tell you how often they actually happened.'}
            </Text>
          </GlassCard>
        )}

        {list.map((t) => {
          const isDue = t.reviewAt && new Date(t.reviewAt) <= new Date() && t.payload?.didItHappen === undefined;
          const reviewed = t.payload?.didItHappen !== undefined;
          const verdict = t.payload?.didItHappen;
          return (
            <TouchableOpacity
              key={t._id}
              onPress={() => !reviewed && setReviewing(t)}
              activeOpacity={0.85}
            >
              <GlassCard variant="solid" style={[styles.card, isDue && { borderColor: theme.warning, borderWidth: 1.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t.title}</Text>
                    {t.payload?.worry && (
                      <Text style={[styles.cardWorry, { color: theme.textSecondary }]} numberOfLines={3}>
                        {t.payload.worry}
                      </Text>
                    )}
                  </View>
                  {t.payload?.severity && (
                    <View style={[styles.sevBadge, { backgroundColor: `${theme.danger}25` }]}>
                      <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '800' }}>
                        {'!'.repeat(t.payload.severity || 1)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  {t.reviewAt && (
                    <Text style={[styles.metaText, { color: isDue ? theme.warning : theme.textMuted }]}>
                      {isDue
                        ? '⏰ Review now'
                        : `Review ${new Date(t.reviewAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                    </Text>
                  )}
                  {reviewed && (
                    <View style={[styles.verdict, {
                      backgroundColor: verdict === false ? `${theme.success}25` : verdict === 'partial' ? `${theme.warning}25` : `${theme.danger}25`,
                    }]}>
                      <Text style={{ color: verdict === false ? theme.success : verdict === 'partial' ? theme.warning : theme.danger, fontWeight: '800', fontSize: 11 }}>
                        {verdict === false ? "DIDN'T HAPPEN" : verdict === 'partial' ? 'PARTIAL' : 'HAPPENED'}
                      </Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddModal visible={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
      <ReviewModal item={reviewing} onClose={() => setReviewing(null)} onSaved={() => { setReviewing(null); load(); }} />
    </LiquidBackground>
  );
}

function Stat({ color, label, value }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

function AddModal({ visible, onClose, onCreated }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [worry, setWorry] = useState('');
  const [severity, setSeverity] = useState(2);
  const [reviewDate, setReviewDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title || !worry) { Alert.alert('Fill both fields'); return; }
    setSaving(true);
    try {
      await api.post('/tools', {
        kind: 'worry',
        title,
        payload: { worry, severity },
        reviewAt: reviewDate.toISOString(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle(''); setWorry(''); setSeverity(2);
      onCreated();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ScrollView style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Park a worry</Text>
            <GlassInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Job interview" icon="bookmark-outline" />
            <GlassInput
              label="What's worrying you?"
              value={worry}
              onChangeText={setWorry}
              placeholder="Be honest. No one else sees this."
              icon="cloud-outline"
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>SEVERITY</Text>
            <View style={[styles.sevRow, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = severity === n;
                return (
                  <TouchableOpacity key={n} onPress={() => setSeverity(n)} style={[styles.sevBtn, on && { backgroundColor: theme.danger }]}>
                    <Text style={{ color: on ? '#fff' : theme.textSecondary, fontWeight: '800' }}>{'!'.repeat(n)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>REVIEW ON</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <GlassCard variant="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: '700' }}>
                  {reviewDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </GlassCard>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={reviewDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setReviewDate(d); }}
                minimumDate={new Date()}
              />
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Save" onPress={submit} loading={saving} style={{ flex: 1 }} />
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ReviewModal({ item, onClose, onSaved }) {
  const { theme } = useTheme();
  const [outcome, setOutcome] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const submit = async () => {
    if (outcome === null) return;
    setSaving(true);
    try {
      await api.put(`/tools/${item._id}`, {
        payload: { ...item.payload, didItHappen: outcome, outcome: note },
      });
      setOutcome(null); setNote('');
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={!!item} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Review</Text>
            <Text style={[styles.reviewQuote, { color: theme.textSecondary }]}>
              "{item.payload?.worry || item.title}"
            </Text>
            <Text style={[styles.label, { color: theme.textMuted, marginTop: 14 }]}>DID IT HAPPEN?</Text>
            <View style={{ gap: 8, marginBottom: 12 }}>
              {[
                { id: false, label: "No, didn't happen", color: theme.success, icon: 'checkmark-circle' },
                { id: 'partial', label: 'Partially', color: theme.warning, icon: 'remove-circle' },
                { id: true, label: 'Yes, it happened', color: theme.danger, icon: 'close-circle' },
              ].map((o) => {
                const on = outcome === o.id;
                return (
                  <TouchableOpacity
                    key={String(o.id)}
                    onPress={() => setOutcome(o.id)}
                    style={[
                      styles.outcomeBtn,
                      {
                        backgroundColor: on ? `${o.color}25` : theme.inputBg,
                        borderColor: on ? o.color : theme.glassBorder,
                      },
                    ]}
                  >
                    <Ionicons name={o.icon} size={20} color={o.color} />
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <GlassInput
              label="What actually happened?"
              value={note}
              onChangeText={setNote}
              placeholder="optional reflection"
              icon="create-outline"
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Save review" onPress={submit} loading={saving} disabled={outcome === null} style={{ flex: 1 }} />
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

  insightText: { fontSize: 12, fontWeight: '600', marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  dueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, marginBottom: 12,
  },
  tabs: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  tabText: { fontSize: 12, fontWeight: '800' },

  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },

  card: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardWorry: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'space-between' },
  metaText: { fontSize: 11, fontWeight: '700' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verdict: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  sheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, maxHeight: '92%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  reviewQuote: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },

  sevRow: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 1, marginBottom: 14 },
  sevBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },

  outcomeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
  },
});
