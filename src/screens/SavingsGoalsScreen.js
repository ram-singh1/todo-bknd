import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import LiquidBackground from '../components/LiquidBackground';
import GlassCard from '../components/GlassCard';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { GoalRing, AreaChart } from '../components/AdvancedCharts';
import api from '../api/client';
import { fmtMoney, CURRENCY_SYMBOLS } from '../config/budget';

const GOAL_COLORS = ['#10B981', '#6C63FF', '#F97316', '#EC4899', '#0EA5E9', '#A78BFA', '#F59E0B', '#EF4444'];
const GOAL_EMOJIS = ['🎯', '💰', '🏠', '🚗', '✈️', '💍', '🎓', '💻', '📱', '🛒', '🏝️', '🎁'];

export default function SavingsGoalsScreen({ navigation }) {
  const { theme } = useTheme();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showContribute, setShowContribute] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/budget/goals');
      setGoals(res.data.goals || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const archive = (g) => {
    Alert.alert('Delete goal?', `"${g.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.delete(`/budget/goals/${g._id}`);
          load();
        },
      },
    ]);
  };

  return (
    <LiquidBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Savings goals</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.iconBtn}>
          <Ionicons name="add" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {goals.length === 0 && !loading && (
          <GlassCard variant="accent" glow style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Set your first goal</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Vacation, gadget, emergency fund — anything you're saving toward. Track contributions and watch the ring fill up.
            </Text>
            <GlassButton title="Create a goal" icon="add" onPress={() => setShowCreate(true)} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          const sparkValues = (g.contributions || []).slice(-12).map((c) => c.amount);
          return (
            <GlassCard key={g._id} variant="solid" style={styles.goalCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <GoalRing
                  size={108}
                  color={g.color}
                  value={g.saved}
                  target={g.target}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalName, { color: theme.text }]} numberOfLines={1}>
                    {g.emoji} {g.name}
                  </Text>
                  <Text style={[styles.goalAmount, { color: theme.text }]}>
                    {fmtMoney(g.saved, g.currency)} <Text style={{ color: theme.textMuted, fontWeight: '600' }}>/ {fmtMoney(g.target, g.currency)}</Text>
                  </Text>
                  {g.deadline && (
                    <Text style={[styles.goalSub, { color: theme.textMuted }]}>
                      by {new Date(g.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => setShowContribute(g)}
                      style={[styles.actionPill, { backgroundColor: `${g.color}28`, borderColor: `${g.color}66` }]}
                    >
                      <Ionicons name="add" size={14} color={g.color} />
                      <Text style={[styles.actionText, { color: g.color }]}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => archive(g)}
                      style={[styles.actionPill, { backgroundColor: theme.inputBg, borderColor: theme.glassBorder }]}
                    >
                      <Ionicons name="trash-outline" size={13} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {sparkValues.length > 1 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.contribLabel, { color: theme.textMuted }]}>
                    Last {sparkValues.length} contributions
                  </Text>
                  <AreaChart
                    values={sparkValues}
                    primaryColor={g.color}
                    height={70}
                    showYLabels={false}
                  />
                </View>
              )}
            </GlassCard>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>

      <CreateGoalModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
      <ContributeModal
        goal={showContribute}
        onClose={() => setShowContribute(null)}
        onSaved={() => { setShowContribute(null); load(); }}
      />
    </LiquidBackground>
  );
}

function CreateGoalModal({ visible, onClose, onCreated }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const t = parseFloat(target);
    if (!name || !t || t <= 0) {
      Alert.alert('Missing info', 'Set a name and a target amount.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/budget/goals', { name, target: t, emoji, color });
      setName(''); setTarget(''); setEmoji('🎯'); setColor(GOAL_COLORS[0]);
      onCreated();
    } catch (e) {
      Alert.alert('Could not create', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalBg, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New savings goal</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {GOAL_EMOJIS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                  style={[styles.emojiChip, { backgroundColor: emoji === e ? `${color}30` : theme.inputBg, borderColor: emoji === e ? color : theme.glassBorder }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 12 }}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: '#fff' }]} />
              ))}
            </ScrollView>

            <GlassInput label="Name" value={name} onChangeText={setName} placeholder="e.g. New laptop" icon="bookmark-outline" />
            <GlassInput
              label="Target amount"
              value={target}
              onChangeText={(v) => setTarget(v.replace(/[^0-9.]/g, ''))}
              placeholder="500"
              icon="trophy-outline"
              keyboardType="decimal-pad"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Create" onPress={submit} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onSaved }) {
  const { theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!goal) return null;

  const submit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    setSaving(true);
    try {
      await api.post(`/budget/goals/${goal._id}/contribute`, { amount: a, note });
      setAmount(''); setNote('');
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!goal} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalBg, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Add to {goal.emoji} {goal.name}
            </Text>
            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Currently {fmtMoney(goal.saved, goal.currency)} of {fmtMoney(goal.target, goal.currency)}
            </Text>
            <GlassInput
              label="Amount"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder={`${CURRENCY_SYMBOLS[goal.currency || 'USD']} 0.00`}
              icon="wallet-outline"
              keyboardType="decimal-pad"
            />
            <GlassInput label="Note" value={note} onChangeText={setNote} placeholder="optional" icon="create-outline" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <GlassButton title="Add" onPress={submit} loading={saving} style={{ flex: 1 }} />
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

  empty: { marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19 },

  goalCard: { marginBottom: 14 },
  goalName: { fontSize: 15, fontWeight: '800' },
  goalAmount: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  goalSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '800' },
  contribLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },

  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalSub: { fontSize: 12, marginBottom: 16, fontWeight: '600' },
  emojiChip: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
});
